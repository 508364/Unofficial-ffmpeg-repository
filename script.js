// 配置文件
const CONFIG = {
    repoOwner: '508364',
    repoName: 'Unofficial-ffmpeg-repository',
    apiUrl: 'https://api.github.com/repos/508364/Unofficial-ffmpeg-repository/releases/latest',
    proxyUrl: 'https://gh-proxy.com/',
    refreshInterval: 300000, // 5分钟自动刷新
    
    // 文件分类映射
    fileCategories: {
        'windows': {
            name: 'Windows',
            icon: 'fab fa-windows',
            description: 'Windows 版本',
            patterns: [/windows/i, /win/i, /\.exe/i, /essentials_build/i]
        },
        'linux-x64': {
            name: 'Linux x64',
            icon: 'fab fa-linux',
            description: 'Linux 64位版本',
            patterns: [/amd64/i, /x86_64/i, /x64/i]
        },
        'linux-x86': {
            name: 'Linux x86',
            icon: 'fab fa-linux',
            description: 'Linux 32位版本',
            patterns: [/i686/i, /x86/i, /i386/i]
        },
        'linux-arm64': {
            name: 'Linux ARM64',
            icon: 'fab fa-linux',
            description: 'Linux ARM64 版本',
            patterns: [/arm64/i, /aarch64/i]
        },
        'linux-armhf': {
            name: 'Linux ARMHF',
            icon: 'fab fa-linux',
            description: 'Linux ARM硬浮点版本',
            patterns: [/armhf/i]
        },
        'linux-armel': {
            name: 'Linux ARMEL',
            icon: 'fab fa-linux',
            description: 'Linux ARM软浮点版本',
            patterns: [/armel/i]
        },
        'source': {
            name: '源代码',
            icon: 'fas fa-code',
            description: '源代码包',
            patterns: [/source/i, /src\./i]
        },
        'other': {
            name: '其他',
            icon: 'fas fa-file-archive',
            description: '其他文件',
            patterns: []
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
    getFileDescription(fileName, category) {
        const fileInfo = this.getFileCategory(fileName);
        
        // 尝试从文件名中提取版本信息
        const versionMatch = fileName.match(/(\d+\.\d+(?:\.\d+)*)/);
        const version = versionMatch ? versionMatch[1] : '';
        
        // 构建描述
        let description = fileInfo.description;
        
        // 添加特定文件类型的额外描述
        if (fileName.includes('essentials_build')) {
            description = 'Windows 64位版本，包含 ffmpeg, ffprobe, ffplay';
        } else if (fileName.includes('static')) {
            description += ' (静态链接版本)';
        } else if (fileName.includes('shared')) {
            description += ' (动态链接版本)';
        }
        
        return description;
    }
};

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

// 应用主类
class FfmpegDownloader {
    constructor() {
        this.currentRelease = null;
        this.filesData = [];
        this.currentSort = 'name';
        this.searchTerm = '';
        this.init();
    }
    
    async init() {
        this.initClipboard();
        this.initFAQ();
        this.initSearch();
        this.initSorting();
        await this.fetchReleaseData();
        
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
            
            clipboard.on('error', (e) => {
                console.error('复制失败:', e.action);
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
                
                // 关闭所有其他FAQ
                document.querySelectorAll('.faq-question').forEach(q => {
                    if (q !== question) {
                        q.classList.remove('active');
                        q.nextElementSibling.classList.remove('show');
                    }
                });
                
                // 切换当前FAQ
                question.classList.toggle('active', !isActive);
                answer.classList.toggle('show', !isActive);
            });
        });
    }
    
    // 初始化搜索
    initSearch() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'file-search';
        searchContainer.innerHTML = `
            <div class="search-container">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="fileSearch" class="search-input" 
                       placeholder="搜索文件 (按文件名、平台、架构...)">
            </div>
            <div class="search-hint">
                <i class="fas fa-info-circle"></i>
                输入关键词筛选文件，支持平台(Windows/Linux)、架构(x64/arm)等
            </div>
        `;
        
        const downloadSection = document.querySelector('.download-section');
        downloadSection.insertBefore(searchContainer, downloadSection.querySelector('.files-grid'));
        
        const searchInput = document.getElementById('fileSearch');
        searchInput.addEventListener('input', Utils.debounce((e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterAndSortFiles();
        }, 300));
        
        // 添加搜索快捷键
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
        });
    }
    
    // 初始化排序
    initSorting() {
        const sortContainer = document.createElement('div');
        sortContainer.className = 'file-sort';
        sortContainer.innerHTML = `
            <span class="sort-label">排序方式:</span>
            <div class="sort-buttons">
                <button class="sort-btn active" data-sort="name">名称</button>
                <button class="sort-btn" data-sort="size">大小</button>
                <button class="sort-btn" data-sort="type">类型</button>
                <button class="sort-btn" data-sort="platform">平台</button>
            </div>
            <button class="refresh-btn" id="refreshBtn">
                <i class="fas fa-sync-alt"></i> 刷新
            </button>
        `;
        
        const downloadSection = document.querySelector('.download-section');
        downloadSection.insertBefore(sortContainer, downloadSection.querySelector('.file-search'));
        
        // 排序按钮事件
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sortBy = e.target.dataset.sort;
                this.setSort(sortBy);
            });
        });
        
        // 刷新按钮事件
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });
    }
    
    // 设置排序
    setSort(sortBy) {
        this.currentSort = sortBy;
        
        // 更新按钮状态
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
                const description = CONFIG.getFileDescription(fileName, fileCategory);
                
                return fileName.includes(this.searchTerm) ||
                       fileCategory.name.toLowerCase().includes(this.searchTerm) ||
                       description.toLowerCase().includes(this.searchTerm);
            });
        }
        
        // 排序
        filteredFiles.sort((a, b) => {
            switch (this.currentSort) {
                case 'size':
                    return b.size - a.size;
                case 'type':
                    return CONFIG.getFileCategory(a.name).name.localeCompare(CONFIG.getFileCategory(b.name).name);
                case 'platform':
                    const platformA = CONFIG.getFileCategory(a.name);
                    const platformB = CONFIG.getFileCategory(b.name);
                    return platformA.name.localeCompare(platformB.name);
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });
        
        this.displayFiles(filteredFiles);
    }
    
    // 刷新数据
    async refreshData() {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.disabled = true;
        refreshBtn.classList.add('spinning');
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新中...';
        
        try {
            await this.fetchReleaseData();
            
            // 显示成功消息
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
            box-shadow: var(--shadow);
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
            
            const newRelease = await response.json();
            
            if (this.currentRelease && newRelease.id !== this.currentRelease.id) {
                // 有更新
                this.showMessage(`发现新版本: ${newRelease.tag_name}`, 'info');
                this.fetchReleaseData();
            }
            
            // 更新最后检查时间
            this.updateLastCheck();
        } catch (error) {
            console.error('检查更新失败:', error);
        }
    }
    
    // 更新最后检查时间
    updateLastCheck() {
        const updateInfoDiv = document.getElementById('updateInfo');
        if (updateInfoDiv) {
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'update-timestamp';
            timestampDiv.innerHTML = `
                <i class="far fa-clock"></i>
                最后检查: ${new Date().toLocaleTimeString('zh-CN')}
            `;
            
            const existingTimestamp = updateInfoDiv.querySelector('.update-timestamp');
            if (existingTimestamp) {
                existingTimestamp.replaceWith(timestampDiv);
            } else {
                updateInfoDiv.appendChild(timestampDiv);
            }
        }
    }
    
    // 获取发布数据
    async fetchReleaseData() {
        try {
            const response = await fetch(CONFIG.apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const releaseData = await response.json();
            this.currentRelease = releaseData;
            this.processReleaseData(releaseData);
            
        } catch (error) {
            console.error('获取版本信息失败:', error);
            this.displayError(`无法加载发布信息: ${error.message}`);
        }
    }
    
    // 处理发布数据
    processReleaseData(releaseData) {
        this.displayReleaseInfo(releaseData);
        this.displayUpdateInfo(releaseData);
        this.displayFiles(releaseData.assets || []);
        this.updateCodeBlocks(releaseData.assets || []);
        
        // 保存文件数据
        this.filesData = releaseData.assets || [];
        
        // 更新最后检查时间
        this.updateLastCheck();
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
    displayUpdateInfo(releaseData) {
        const updateInfoDiv = document.getElementById('updateInfo');
        
        updateInfoDiv.innerHTML = `
            <h4><i class="fas fa-history"></i> 版本信息</h4>
            <p><strong>最新版本:</strong> <span class="version-tag">${Utils.escapeHtml(releaseData.tag_name)}</span></p>
            <p><strong>发布日期:</strong> ${Utils.formatDate(releaseData.published_at)}</p>
            <p><strong>文件总数:</strong> ${releaseData.assets.length} 个</p>
            ${releaseData.body ? `<p><strong>更新说明:</strong> ${Utils.escapeHtml(releaseData.body.substring(0, 150))}${releaseData.body.length > 150 ? '...' : ''}</p>` : ''}
        `;
    }
    
    // 显示发布信息
    displayReleaseInfo(releaseData) {
        const versionInfoDiv = document.getElementById('versionInfo');
        
        versionInfoDiv.innerHTML = `
            <div class="version-item">
                <div class="version-label">最新版本</div>
                <div class="version-value">${Utils.escapeHtml(releaseData.tag_name)}</div>
            </div>
            <div class="version-item">
                <div class="version-label">发布时间</div>
                <div class="version-value">${Utils.formatDate(releaseData.published_at)}</div>
            </div>
            <div class="version-item">
                <div class="version-label">文件数量</div>
                <div class="version-value">${releaseData.assets.length}</div>
            </div>
            <div class="version-item">
                <div class="version-label">自动同步</div>
                <div class="version-value">
                    <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                    已启用
                </div>
            </div>
        `;
    }
    
    // 显示文件列表
    displayFiles(assets) {
        const filesContainer = document.getElementById('filesContainer');
        
        if (!assets || assets.length === 0) {
            filesContainer.innerHTML = '<div class="no-results"><i class="fas fa-inbox"></i><p>暂无可用文件</p></div>';
            return;
        }
        
        // 按类别分组
        const filesByCategory = {};
        
        assets.forEach(asset => {
            const category = CONFIG.getFileCategory(asset.name);
            if (!filesByCategory[category.id]) {
                filesByCategory[category.id] = [];
            }
            filesByCategory[category.id].push(asset);
        });
        
        // 清空容器
        filesContainer.innerHTML = '';
        
        // 按类别顺序显示
        const categoryOrder = ['windows', 'linux-x64', 'linux-x86', 'linux-arm64', 'linux-armhf', 'linux-armel', 'source', 'other'];
        
        categoryOrder.forEach(categoryId => {
            if (filesByCategory[categoryId] && filesByCategory[categoryId].length > 0) {
                const category = CONFIG.fileCategories[categoryId];
                const categoryTitle = document.createElement('div');
                categoryTitle.className = 'files-category';
                categoryTitle.innerHTML = `<h3><i class="${category.icon}"></i> ${category.name}</h3>`;
                filesContainer.appendChild(categoryTitle);
                
                filesByCategory[categoryId].forEach(asset => {
                    const fileCard = this.createFileCard(asset);
                    filesContainer.appendChild(fileCard);
                });
            }
        });
    }
    
    // 创建文件卡片
    createFileCard(asset) {
        const fileName = asset.name;
        const fileSize = Utils.formatFileSize(asset.size);
        const fileCategory = CONFIG.getFileCategory(fileName);
        const description = CONFIG.getFileDescription(fileName, fileCategory);
        
        const directUrl = asset.browser_download_url;
        const proxyDownloadUrl = CONFIG.proxyUrl + directUrl;
        
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        fileCard.dataset.name = fileName.toLowerCase();
        
        fileCard.innerHTML = `
            <div class="file-header">
                <div class="file-name">${Utils.escapeHtml(fileName)}</div>
                <div class="file-size">${fileSize}</div>
            </div>
            <div class="file-platform">
                <i class="${fileCategory.icon}"></i> ${fileCategory.name}
                <span class="file-type ${fileCategory.id}">${this.getFileType(fileName)}</span>
            </div>
            <p class="file-description">${Utils.escapeHtml(description)}</p>
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
        `;
        
        return fileCard;
    }
    
    // 获取文件类型
    getFileType(fileName) {
        if (fileName.endsWith('.zip')) return 'ZIP';
        if (fileName.endsWith('.tar.xz')) return 'TAR.XZ';
        if (fileName.endsWith('.tar.gz')) return 'TAR.GZ';
        if (fileName.endsWith('.exe')) return 'EXE';
        if (fileName.endsWith('.deb')) return 'DEB';
        if (fileName.endsWith('.rpm')) return 'RPM';
        return 'FILE';
    }
    
    // 更新代码块中的下载链接
    updateCodeBlocks(assets) {
        const linuxCodeBlock = document.getElementById('linux-code');
        if (linuxCodeBlock) {
            // 查找Linux amd64版本
            const linuxAmd64Asset = assets.find(asset => {
                const category = CONFIG.getFileCategory(asset.name);
                return category.id === 'linux-x64' && asset.name.includes('static');
            });
            
            if (linuxAmd64Asset) {
                const proxyUrl = CONFIG.proxyUrl + linuxAmd64Asset.browser_download_url;
                
                // 提取版本号
                const versionMatch = linuxAmd64Asset.name.match(/(\d+\.\d+(?:\.\d+)*)/);
                const version = versionMatch ? versionMatch[1] : '版本号';
                
                // 更新代码
                linuxCodeBlock.innerHTML = linuxCodeBlock.innerHTML
                    .replace(/\[下载链接\]/, `"${proxyUrl}"`)
                    .replace(/ffmpeg-\[版本号\]-amd64-static/, `ffmpeg-${version}-amd64-static`);
                
                // 重新高亮代码
                this.highlightCode(linuxCodeBlock);
            }
        }
    }
    
    // 代码高亮
    highlightCode(codeBlock) {
        const code = codeBlock.textContent;
        let highlighted = code;
        
        // 注释
        highlighted = highlighted.replace(/#(.*)/g, '<span class="comment">#$1</span>');
        
        // 字符串
        highlighted = highlighted.replace(/"[^"]*"/g, '<span class="string">$&</span>');
        
        // 命令
        const commands = ['wget', 'tar', 'cd', './', 'sudo', 'cp', 'ffmpeg', 'ffprobe', 'ffplay'];
        commands.forEach(cmd => {
            const regex = new RegExp(`\\b${cmd}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="keyword">${cmd}</span>`);
        });
        
        // 参数
        highlighted = highlighted.replace(/-[a-zA-Z]+/g, '<span class="parameter">$&</span>');
        
        // 文件路径
        highlighted = highlighted.replace(/\/[\w\/.-]+/g, '<span class="string">$&</span>');
        
        // 版本号
        highlighted = highlighted.replace(/(\d+\.\d+(?:\.\d+)*)/g, '<span class="number">$1</span>');
        
        codeBlock.innerHTML = highlighted;
    }
}

// 下载跟踪
function trackDownload(fileName, type) {
    console.log(`下载跟踪: ${fileName} (${type})`);
    
    // 这里可以添加Google Analytics或其他统计代码
    // 例如: gtag('event', 'download', { file_name: fileName, download_type: type });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new FfmpegDownloader();
    
    // 添加页面加载动画
    document.body.classList.add('loaded');
    
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
    `;
    document.head.appendChild(style);
});
