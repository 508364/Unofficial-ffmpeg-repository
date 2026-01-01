// 配置文件
const CONFIG = {
    repoOwner: '508364',
    repoName: 'Unofficial-ffmpeg-repository',
    apiUrl: 'https://api.github.com/repos/508364/Unofficial-ffmpeg-repository/releases',
    proxyUrl: 'https://gh-proxy.com/',
    refreshInterval: 300000, // 5分钟自动刷新
    maxReleasesToCheck: 10, // 最多检查多少个版本来回溯架构
    
    // 架构优先级（用于回溯）
    architecturePriority: [
        'windows',
        'linux-x64', 
        'linux-x86',
        'linux-arm64',
        'linux-armhf',
        'linux-armel'
    ],
    
    // 文件分类映射
    fileCategories: {
        'windows': {
            name: 'Windows',
            icon: 'fab fa-windows',
            description: 'Windows 64位版本，包含 ffmpeg, ffprobe, ffplay',
            patterns: [/windows/i, /win/i, /\.exe/i, /essentials_build/i],
            order: 1,
            fallback: true // 允许回溯
        },
        'linux-x64': {
            name: 'Linux x64',
            icon: 'fab fa-linux',
            description: 'Linux 64位 (x86_64) 静态版本',
            patterns: [/amd64/i, /x86_64/i, /x64/i],
            order: 2,
            fallback: true
        },
        'linux-x86': {
            name: 'Linux x86',
            icon: 'fab fa-linux',
            description: 'Linux 32位 (i686) 静态版本',
            patterns: [/i686/i, /x86/i, /i386/i],
            order: 3,
            fallback: true
        },
        'linux-arm64': {
            name: 'Linux ARM64',
            icon: 'fas fa-microchip',
            description: 'Linux ARM64 静态版本',
            patterns: [/arm64/i, /aarch64/i],
            order: 4,
            fallback: true
        },
        'linux-armhf': {
            name: 'Linux ARMHF',
            icon: 'fas fa-raspberry-pi',
            description: 'Linux ARM硬浮点静态版本',
            patterns: [/armhf/i],
            order: 5,
            fallback: true
        },
        'linux-armel': {
            name: 'Linux ARMEL',
            icon: 'fas fa-robot',
            description: 'Linux ARM软浮点静态版本',
            patterns: [/armel/i],
            order: 6,
            fallback: true
        },
        'source': {
            name: '源代码',
            icon: 'fas fa-code',
            description: '源代码包',
            patterns: [/source/i, /src\./i],
            order: 7,
            fallback: false
        },
        'other': {
            name: '其他',
            icon: 'fas fa-file-archive',
            description: '其他文件',
            patterns: [],
            order: 8,
            fallback: false
        }
    },
    
    // 获取文件分类
    getFileCategory(fileName) {
        for (const [category, info] of Object.entries(this.fileCategories)) {
            for (const pattern of info.patterns) {
                if (pattern.test(fileName)) {
                    return { id: category, ...info };
                }
            }
        }
        return this.fileCategories.other;
    },
    
    // 获取文件描述
    getFileDescription(fileName) {
        const category = this.getFileCategory(fileName);
        
        if (fileName.includes('essentials_build')) {
            return 'Windows 64位版本，包含 ffmpeg, ffprobe, ffplay';
        } else if (fileName.includes('static')) {
            return `${category.description} (静态链接版本)`;
        } else if (fileName.includes('shared')) {
            return `${category.description} (动态链接版本)`;
        }
        
        return category.description;
    },
    
    // 获取文件类型标签
    getFileType(fileName) {
        if (fileName.endsWith('.zip')) return 'ZIP';
        if (fileName.endsWith('.tar.xz')) return 'TAR.XZ';
        if (fileName.endsWith('.tar.gz')) return 'TAR.GZ';
        if (fileName.endsWith('.exe')) return 'EXE';
        if (fileName.endsWith('.deb')) return 'DEB';
        if (fileName.endsWith('.rpm')) return 'RPM';
        return 'FILE';
    }
};

// 架构回溯管理器
class ArchitectureFallbackManager {
    constructor() {
        this.releases = [];
        this.architectureCache = new Map(); // 缓存每个架构的最新可用版本
    }
    
    // 设置发布数据
    setReleases(releases) {
        this.releases = releases;
        this.buildArchitectureCache();
    }
    
    // 构建架构缓存
    buildArchitectureCache() {
        this.architectureCache.clear();
        
        // 为每个架构查找最新可用版本
        for (const archId of CONFIG.architecturePriority) {
            const archInfo = CONFIG.fileCategories[archId];
            if (!archInfo || !archInfo.fallback) continue;
            
            // 从最新版本开始查找
            for (const release of this.releases.slice(0, CONFIG.maxReleasesToCheck)) {
                const hasArchitecture = this.releaseHasArchitecture(release, archId);
                if (hasArchitecture) {
                    this.architectureCache.set(archId, {
                        release: release,
                        assets: hasArchitecture.assets
                    });
                    break;
                }
            }
        }
    }
    
    // 检查发布是否包含特定架构
    releaseHasArchitecture(release, architectureId) {
        const archInfo = CONFIG.fileCategories[architectureId];
        if (!archInfo) return false;
        
        const matchingAssets = release.assets.filter(asset => {
            const category = CONFIG.getFileCategory(asset.name);
            return category.id === architectureId;
        });
        
        return matchingAssets.length > 0 ? {
            release: release,
            assets: matchingAssets
        } : false;
    }
    
    // 获取架构的最新可用文件
    getLatestArchitectureFiles(architectureId) {
        return this.architectureCache.get(architectureId) || null;
    }
    
    // 获取所有架构的可用状态
    getArchitectureStatus() {
        const status = {};
        
        for (const archId of CONFIG.architecturePriority) {
            const cacheEntry = this.architectureCache.get(archId);
            status[archId] = {
                available: !!cacheEntry,
                version: cacheEntry ? cacheEntry.release.tag_name : null,
                isLatest: cacheEntry ? this.releases[0] && cacheEntry.release.id === this.releases[0].id : false
            };
        }
        
        return status;
    }
}

// 应用主类
class FfmpegDownloader {
    constructor() {
        this.currentRelease = null;
        this.allReleases = [];
        this.filesData = [];
        this.currentSort = 'category';
        this.searchTerm = '';
        this.fallbackManager = new ArchitectureFallbackManager();
        this.architectureStatus = {};
        this.init();
    }
    
    async init() {
        this.initClipboard();
        this.initFAQ();
        this.initControlPanel();
        await this.fetchAllReleasesData();
        
        // 自动刷新
        setInterval(() => this.checkForUpdates(), CONFIG.refreshInterval);
    }
    
    // 初始化剪贴板
    initClipboard() {
        if (typeof ClipboardJS !== 'undefined') {
            const clipboard = new ClipboardJS('.copy-btn', {
                text: function(trigger) {
                    const target = trigger.getAttribute('data-clipboard-target');
                    const codeBlock = document.querySelector(target);
                    return codeBlock ? codeBlock.textContent : '';
                }
            });
            
            clipboard.on('success', (e) => {
                const button = e.trigger;
                const originalText = button.innerHTML;
                
                button.innerHTML = '<i class="fas fa-check"></i> 已复制';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.remove('copied');
                }, 2000);
                
                e.clearSelection();
            });
        }
    }
    
    // 初始化FAQ
    initFAQ() {
        const faqQuestions = document.querySelectorAll('.faq-question');
        
        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                const isActive = question.classList.contains('active');
                
                document.querySelectorAll('.faq-question').forEach(q => {
                    if (q !== question) {
                        q.classList.remove('active');
                        q.nextElementSibling.classList.remove('show');
                    }
                });
                
                question.classList.toggle('active', !isActive);
                answer.classList.toggle('show', !isActive);
            });
        });
    }
    
    // 初始化控制面板
    initControlPanel() {
        const controlPanel = document.getElementById('controlPanel');
        if (!controlPanel) return;
        
        controlPanel.innerHTML = `
            <div class="search-container">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="fileSearch" class="search-input" 
                       placeholder="搜索文件 (按文件名、平台、架构...)">
            </div>
            <div class="sort-buttons">
                <button class="sort-btn active" data-sort="category">分类</button>
                <button class="sort-btn" data-sort="name">名称</button>
                <button class="sort-btn" data-sort="size">大小</button>
                <button class="sort-btn" data-sort="version">版本</button>
            </div>
            <button class="refresh-btn" id="refreshBtn">
                <i class="fas fa-sync-alt"></i> 刷新
            </button>
        `;
        
        // 搜索功能
        const searchInput = document.getElementById('fileSearch');
        searchInput.addEventListener('input', Utils.debounce((e) => {
            this.searchTerm = e.target.value.toLowerCase().trim();
            this.filterAndSortFiles();
        }, 300));
        
        // 排序功能
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sortBy = e.target.dataset.sort;
                this.setSort(sortBy);
            });
        });
        
        // 刷新功能
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });
    }
    
    // 设置排序
    setSort(sortBy) {
        this.currentSort = sortBy;
        
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === sortBy);
        });
        
        this.filterAndSortFiles();
    }
    
    // 筛选和排序文件
    filterAndSortFiles() {
        let filteredFiles = [...this.filesData];
        
        // 搜索筛选
        if (this.searchTerm) {
            filteredFiles = filteredFiles.filter(file => {
                const fileName = file.name.toLowerCase();
                const fileCategory = CONFIG.getFileCategory(fileName);
                const description = CONFIG.getFileDescription(fileName);
                
                return fileName.includes(this.searchTerm) ||
                       fileCategory.name.toLowerCase().includes(this.searchTerm) ||
                       description.toLowerCase().includes(this.searchTerm);
            });
        }
        
        // 排序
        filteredFiles.sort((a, b) => {
            const categoryA = CONFIG.getFileCategory(a.name);
            const categoryB = CONFIG.getFileCategory(b.name);
            
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return b.size - a.size;
                case 'version':
                    // 按版本排序（需要从文件数据中提取版本信息）
                    const versionA = this.getFileVersion(a);
                    const versionB = this.getFileVersion(b);
                    return versionB.localeCompare(versionA);
                case 'category':
                default:
                    if (categoryA.order !== categoryB.order) {
                        return categoryA.order - categoryB.order;
                    }
                    return a.name.localeCompare(b.name);
            }
        });
        
        this.displayFiles(filteredFiles);
    }
    
    // 从文件名中提取版本号
    getFileVersion(file) {
        // 从文件名中匹配版本号模式
        const versionMatch = file.name.match(/(\d+\.\d+(?:\.\d+)*)/);
        return versionMatch ? versionMatch[1] : '0.0.0';
    }
    
    // 刷新数据
    async refreshData() {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.disabled = true;
        refreshBtn.classList.add('spinning');
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新中...';
        
        try {
            await this.fetchAllReleasesData();
            this.showMessage('数据已刷新!', 'success');
        } catch (error) {
            console.error('刷新失败:', error);
            this.showMessage('刷新失败，请重试!', 'error');
        } finally {
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.classList.remove('spinning');
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新';
            }, 1000);
        }
    }
    
    // 显示消息
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-hover);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }
    
    // 检查更新
    async checkForUpdates() {
        try {
            const response = await fetch(CONFIG.apiUrl);
            if (!response.ok) return;
            
            const newReleases = await response.json();
            
            if (this.allReleases.length > 0 && newReleases[0] && 
                newReleases[0].id !== this.allReleases[0].id) {
                this.showMessage(`发现新版本: ${newReleases[0].tag_name}`, 'info');
                this.fetchAllReleasesData();
            }
            
            this.updateLastCheck();
        } catch (error) {
            console.error('检查更新失败:', error);
        }
    }
    
    // 更新最后检查时间
    updateLastCheck() {
        const updateInfoDiv = document.getElementById('updateInfo');
        if (updateInfoDiv && !updateInfoDiv.querySelector('.update-timestamp')) {
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'update-timestamp';
            timestampDiv.innerHTML = `
                <i class="far fa-clock"></i>
                最后检查: ${new Date().toLocaleTimeString('zh-CN')}
            `;
            updateInfoDiv.appendChild(timestampDiv);
        }
    }
    
    // 获取所有发布数据
    async fetchAllReleasesData() {
        try {
            const response = await fetch(CONFIG.apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const allReleases = await response.json();
            this.allReleases = allReleases;
            this.currentRelease = allReleases[0]; // 最新版本
            
            // 设置架构回溯管理器
            this.fallbackManager.setReleases(allReleases);
            this.architectureStatus = this.fallbackManager.getArchitectureStatus();
            
            this.processAllReleasesData(allReleases);
            
        } catch (error) {
            console.error('获取版本信息失败:', error);
            this.displayError(`无法加载发布信息: ${error.message}`);
        }
    }
    
    // 处理所有发布数据
    processAllReleasesData(allReleases) {
        this.displayReleaseInfo(this.currentRelease);
        this.displayUpdateInfo(allReleases);
        this.displayArchitectureStatus();
        this.compileFilesFromAllReleases(allReleases);
        this.updateCodeBlocks(allReleases);
        
        // 更新最后检查时间
        this.updateLastCheck();
    }
    
    // 从所有发布中编译文件列表
    compileFilesFromAllReleases(allReleases) {
        const allFiles = [];
        
        // 为每个架构添加文件
        for (const archId of CONFIG.architecturePriority) {
            const archFiles = this.fallbackManager.getLatestArchitectureFiles(archId);
            if (archFiles) {
                archFiles.assets.forEach(asset => {
                    // 添加版本信息到文件对象
                    const fileWithVersion = {
                        ...asset,
                        version: archFiles.release.tag_name,
                        isLatest: archFiles.release.id === this.currentRelease.id
                    };
                    allFiles.push(fileWithVersion);
                });
            }
        }
        
        // 添加最新版本的其他文件（源代码等）
        if (this.currentRelease && this.currentRelease.assets) {
            this.currentRelease.assets.forEach(asset => {
                const category = CONFIG.getFileCategory(asset.name);
                // 只添加非回溯分类的文件，或者最新版本特有的文件
                if (!category.fallback || category.id === 'source' || category.id === 'other') {
                    const fileWithVersion = {
                        ...asset,
                        version: this.currentRelease.tag_name,
                        isLatest: true
                    };
                    // 避免重复添加
                    if (!allFiles.some(file => file.id === asset.id)) {
                        allFiles.push(fileWithVersion);
                    }
                }
            });
        }
        
        this.filesData = allFiles;
        this.filterAndSortFiles();
    }
    
    // 显示架构状态
    displayArchitectureStatus() {
        const versionInfoDiv = document.getElementById('versionInfo');
        if (!versionInfoDiv) return;
        
        let statusHTML = `
            <div class="version-item">
                <div class="version-label">最新版本</div>
                <div class="version-value">${Utils.escapeHtml(this.currentRelease.tag_name)}</div>
            </div>
            <div class="version-item">
                <div class="version-label">发布时间</div>
                <div class="version-value">${Utils.formatDate(this.currentRelease.published_at)}</div>
            </div>
            <div class="version-item">
                <div class="version-label">架构状态</div>
                <div class="version-value">
                    <span class="arch-status-badge">${Object.values(this.architectureStatus).filter(s => s.available).length}/${Object.keys(this.architectureStatus).length}</span>
                </div>
            </div>
        `;
        
        versionInfoDiv.innerHTML = statusHTML;
    }
    
    // 显示错误信息
    displayError(message) {
        const versionInfoDiv = document.getElementById('versionInfo');
        versionInfoDiv.innerHTML = `
            <div class="error">
                <strong>错误:</strong> ${Utils.escapeHtml(message)}
                <p>请刷新页面重试，或直接访问 <a href="https://github.com/${CONFIG.repoOwner}/${CONFIG.repoName}/releases" target="_blank">GitHub Releases 页面</a></p>
            </div>
        `;
    }
    
    // 显示更新信息
    displayUpdateInfo(allReleases) {
        const updateInfoDiv = document.getElementById('updateInfo');
        const checkedReleases = Math.min(allReleases.length, CONFIG.maxReleasesToCheck);
        
        let architectureInfo = '<div class="architecture-status-grid">';
        for (const [archId, status] of Object.entries(this.architectureStatus)) {
            const archInfo = CONFIG.fileCategories[archId];
            if (!archInfo) continue;
            
            const versionText = status.available ? 
                (status.isLatest ? '最新版本' : `v${status.version}`) : 
                '不可用';
            
            const statusClass = status.available ? 
                (status.isLatest ? 'latest' : 'fallback') : 
                'unavailable';
            
            architectureInfo += `
                <div class="arch-status-item ${statusClass}">
                    <i class="${archInfo.icon}"></i>
                    <span class="arch-name">${archInfo.name}</span>
                    <span class="arch-version">${versionText}</span>
                </div>
            `;
        }
        architectureInfo += '</div>';
        
        updateInfoDiv.innerHTML = `
            <h4><i class="fas fa-history"></i> 版本与架构信息</h4>
            <p><strong>最新版本:</strong> <span class="version-tag">${Utils.escapeHtml(this.currentRelease.tag_name)}</span></p>
            <p><strong>发布日期:</strong> ${Utils.formatDate(this.currentRelease.published_at)}</p>
            <p><strong>架构回溯:</strong> 已检查最近 ${checkedReleases} 个版本</p>
            <div class="architecture-section">
                <h5><i class="fas fa-microchip"></i> 架构可用性</h5>
                ${architectureInfo}
            </div>
            ${this.currentRelease.body ? `<p><strong>更新说明:</strong> ${Utils.escapeHtml(this.currentRelease.body.substring(0, 150))}${this.currentRelease.body.length > 150 ? '...' : ''}</p>` : ''}
        `;
    }
    
    // 显示发布信息
    displayReleaseInfo(releaseData) {
        // 这个功能已经被 displayArchitectureStatus 替代
    }
    
    // 显示文件列表
    displayFiles(files) {
        const filesContainer = document.getElementById('filesContainer');
        
        if (!files || files.length === 0) {
            filesContainer.innerHTML = '<div class="no-results"><i class="fas fa-inbox"></i><p>暂无可用文件</p></div>';
            return;
        }
        
        // 按类别分组
        const filesByCategory = {};
        const usedCategories = new Set();
        
        Object.keys(CONFIG.fileCategories).forEach(category => {
            filesByCategory[category] = [];
        });
        
        // 分组文件
        files.forEach(file => {
            const category = CONFIG.getFileCategory(file.name);
            filesByCategory[category.id].push(file);
            usedCategories.add(category.id);
        });
        
        // 清空容器
        filesContainer.innerHTML = '';
        
        // 按分类顺序显示
        const sortedCategories = Array.from(usedCategories)
            .sort((a, b) => CONFIG.fileCategories[a].order - CONFIG.fileCategories[b].order);
        
        sortedCategories.forEach(categoryId => {
            const categoryFiles = filesByCategory[categoryId];
            if (categoryFiles.length === 0) return;
            
            const category = CONFIG.fileCategories[categoryId];
            
            // 添加分类标题
            if (categoryId !== 'other') {
                const categoryTitle = document.createElement('div');
                categoryTitle.className = 'files-category';
                
                // 获取该分类的版本信息
                const categoryVersion = this.getCategoryVersionInfo(categoryFiles);
                const versionBadge = categoryVersion.isLatest ? 
                    '<span class="version-badge latest">最新版本</span>' : 
                    `<span class="version-badge fallback">v${categoryVersion.version}</span>`;
                
                categoryTitle.innerHTML = `
                    <h3>
                        <i class="${category.icon}"></i> ${category.name}
                        ${versionBadge}
                    </h3>
                    ${categoryVersion.isLatest ? '' : '<p class="fallback-notice">此架构文件来自较早版本，但保证功能完整</p>'}
                `;
                filesContainer.appendChild(categoryTitle);
            }
            
            // 添加文件卡片
            categoryFiles.forEach(file => {
                const fileCard = this.createFileCard(file);
                filesContainer.appendChild(fileCard);
            });
        });
    }
    
    // 获取分类的版本信息
    getCategoryVersionInfo(files) {
        if (files.length === 0) return { version: '未知', isLatest: false };
        
        // 取第一个文件的版本信息
        const firstFile = files[0];
        return {
            version: firstFile.version || '未知',
            isLatest: firstFile.isLatest === true
        };
    }
    
    // 创建文件卡片（增强版）
    createFileCard(file) {
        const fileName = file.name;
        const fileSize = Utils.formatFileSize(file.size);
        const fileCategory = CONFIG.getFileCategory(fileName);
        const description = CONFIG.getFileDescription(fileName);
        const fileType = CONFIG.getFileType(fileName);
        
        const directUrl = file.browser_download_url;
        const proxyDownloadUrl = CONFIG.proxyUrl + directUrl;
        
        const versionInfo = file.isLatest ? 
            '<div class="version-indicator latest">最新版本</div>' :
            `<div class="version-indicator fallback">v${file.version}</div>`;
        
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        fileCard.dataset.name = fileName.toLowerCase();
        fileCard.dataset.category = fileCategory.id;
        fileCard.dataset.version = file.version;
        
        fileCard.innerHTML = `
            <div class="card-header">
                <div class="platform-info">
                    <i class="${fileCategory.icon} platform-icon"></i>
                    <h4 class="platform-name">${fileCategory.name}</h4>
                </div>
                ${versionInfo}
            </div>
            <div class="file-size-badge">${fileSize}</div>
            <div class="card-body">
                <div class="file-name">${Utils.escapeHtml(fileName)}</div>
                <p class="file-description">${Utils.escapeHtml(description)}</p>
            </div>
            <div class="card-footer">
                <div class="download-buttons">
                    <a href="${proxyDownloadUrl}" class="btn btn-primary" download 
                       onclick="trackDownload('${fileName}', 'proxy')">
                        <i class="fas fa-bolt"></i> 加速下载
                    </a>
                    <a href="${directUrl}" class="btn btn-secondary" download
                       onclick="trackDownload('${fileName}', 'direct')">
                        <i class="fas fa-download"></i> 直接下载
                    </a>
                </div>
            </div>
        `;
        
        return fileCard;
    }
    
    // 更新代码块中的下载链接
    updateCodeBlocks(allReleases) {
        const linuxCodeBlock = document.getElementById('linux-code');
        if (linuxCodeBlock) {
            // 查找最新的Linux amd64版本
            let linuxAmd64Asset = null;
            for (const release of allReleases) {
                const asset = release.assets.find(asset => {
                    return (asset.name.includes('amd64') || asset.name.includes('x86_64')) && 
                           asset.name.includes('static') &&
                           !asset.name.includes('i686');
                });
                if (asset) {
                    linuxAmd64Asset = { asset, release };
                    break;
                }
            }
            
            if (linuxAmd64Asset) {
                const proxyUrl = CONFIG.proxyUrl + linuxAmd64Asset.asset.browser_download_url;
                const versionMatch = linuxAmd64Asset.asset.name.match(/(\d+\.\d+(?:\.\d+)*)/);
                const version = versionMatch ? versionMatch[1] : '版本号';
                
                linuxCodeBlock.innerHTML = linuxCodeBlock.innerHTML
                    .replace(/\[下载链接\]/, `"${proxyUrl}"`)
                    .replace(/ffmpeg-\[版本号\]-amd64-static/, `ffmpeg-${version}-amd64-static`);
                
                this.highlightCode(linuxCodeBlock);
            }
        }
    }
    
    // 代码高亮
    highlightCode(codeBlock) {
        // 保持原有高亮逻辑
        const code = codeBlock.textContent;
        let highlighted = code;
        
        highlighted = highlighted.replace(/#(.*)/g, '<span class="comment">#$1</span>');
        highlighted = highlighted.replace(/"[^"]*"/g, '<span class="string">$&</span>');
        
        const commands = ['wget', 'tar', 'cd', './', 'sudo', 'cp', 'ffmpeg', 'ffprobe', 'ffplay'];
        commands.forEach(cmd => {
            const regex = new RegExp(`\\b${cmd}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="keyword">${cmd}</span>`);
        });
        
        highlighted = highlighted.replace(/-[a-zA-Z]+/g, '<span class="parameter">$&</span>');
        highlighted = highlighted.replace(/\/[\w\/.-]+/g, '<span class="string">$&</span>');
        highlighted = highlighted.replace(/(\d+\.\d+(?:\.\d+)*)/g, '<span class="number">$1</span>');
        
        codeBlock.innerHTML = highlighted;
    }
}

// 工具函数
class Utils {
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// 下载跟踪
function trackDownload(fileName, type) {
    console.log(`下载跟踪: ${fileName} (${type})`);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new FfmpegDownloader();
    
    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .loaded .container {
            animation: fadeIn 0.5s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* 新增样式 */
        .arch-status-badge {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .architecture-status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        
        .arch-status-item {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 0.8rem;
            border-radius: var(--border-radius);
            background: #f8f9fa;
            border-left: 4px solid #6c757d;
        }
        
        .arch-status-item.latest {
            border-left-color: #28a745;
            background: linear-gradient(135deg, #f8fff9, #e8f5e8);
        }
        
        .arch-status-item.fallback {
            border-left-color: #ffc107;
            background: linear-gradient(135deg, #fffbf0, #fff3cd);
        }
        
        .arch-status-item.unavailable {
            border-left-color: #dc3545;
            background: linear-gradient(135deg, #fdf2f2, #f8d7da);
            opacity: 0.6;
        }
        
        .arch-status-item i {
            font-size: 1.2rem;
            width: 24px;
            text-align: center;
        }
        
        .arch-name {
            font-weight: 600;
            flex: 1;
        }
        
        .arch-version {
            font-size: 0.85rem;
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            background: #e9ecef;
            color: #495057;
        }
        
        .version-badge {
            font-size: 0.8rem;
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            margin-left: 0.8rem;
            font-weight: 600;
        }
        
        .version-badge.latest {
            background: #28a745;
            color: white;
        }
        
        .version-badge.fallback {
            background: #ffc107;
            color: #212529;
        }
        
        .fallback-notice {
            font-size: 0.9rem;
            color: #6c757d;
            margin: 0.5rem 0 0 0;
            font-style: italic;
        }
        
        .version-indicator {
            font-size: 0.75rem;
            padding: 0.2rem 0.5rem;
            border-radius: 8px;
            font-weight: 600;
        }
        
        .version-indicator.latest {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .version-indicator.fallback {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        
        .file-size-badge {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: linear-gradient(135deg, #2088ff, #764ba2);
            color: white;
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            z-index: 2;
        }
        
        .architecture-section {
            margin: 1.5rem 0;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: var(--border-radius);
            border-left: 4px solid #2088ff;
        }
        
        .architecture-section h5 {
            color: #2088ff;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .version-tag {
            background: #2088ff;
            color: white;
            padding: 0.2rem 0.6rem;
            border-radius: 4px;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
});
