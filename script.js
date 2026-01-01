// 配置文件
const CONFIG = {
    repoOwner: '508364',
    repoName: 'Unofficial-ffmpeg-repository',
    apiUrl: 'https://api.github.com/repos/508364/Unofficial-ffmpeg-repository/releases/latest',
    proxyUrl: 'https://gh-proxy.com/',
    
    // 文件描述映射
    fileDescriptions: {
        'ffmpeg-7.1.1-essentials_build.zip': 'Windows 64位版本，包含 ffmpeg, ffprobe, ffplay',
        'ffmpeg-release-amd64-static.tar.xz': 'Linux 64位 (x86_64) 静态版本',
        'ffmpeg-release-i686-static.tar.xz': 'Linux 32位 (i686) 静态版本',
        'ffmpeg-release-arm64-static.tar.xz': 'Linux ARM64 静态版本',
        'ffmpeg-release-armhf-static.tar.xz': 'Linux ARMHF 静态版本',
        'ffmpeg-release-armel-static.tar.xz': 'Linux ARMEL 静态版本'
    },
    
    // 平台图标映射
    platformIcons: {
        'ffmpeg-7.1.1-essentials_build.zip': 'fab fa-windows',
        'ffmpeg-release-amd64-static.tar.xz': 'fas fa-desktop',
        'ffmpeg-release-i686-static.tar.xz': 'fas fa-desktop',
        'ffmpeg-release-arm64-static.tar.xz': 'fas fa-microchip',
        'ffmpeg-release-armhf-static.tar.xz': 'fas fa-raspberry-pi',
        'ffmpeg-release-armel-static.tar.xz': 'fas fa-robot'
    },
    
    // 平台标签映射
    platformLabels: {
        'ffmpeg-7.1.1-essentials_build.zip': 'Windows',
        'ffmpeg-release-amd64-static.tar.xz': 'Linux x86_64',
        'ffmpeg-release-i686-static.tar.xz': 'Linux i686',
        'ffmpeg-release-arm64-static.tar.xz': 'Linux ARM64',
        'ffmpeg-release-armhf-static.tar.xz': 'Linux ARMHF',
        'ffmpeg-release-armel-static.tar.xz': 'Linux ARMEL'
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
}

// 应用主类
class FfmpegDownloader {
    constructor() {
        this.init();
    }
    
    async init() {
        this.initClipboard();
        this.initFAQ();
        this.fetchReleaseData();
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
    
    // 获取发布数据
    async fetchReleaseData() {
        try {
            const response = await fetch(CONFIG.apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const releaseData = await response.json();
            this.displayReleaseInfo(releaseData);
            
        } catch (error) {
            console.error('获取版本信息失败:', error);
            this.displayError(`无法加载发布信息: ${error.message}`);
        }
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
    
    // 显示发布信息
    displayReleaseInfo(releaseData) {
        this.updateVersionInfo(releaseData);
        this.updateFilesList(releaseData);
    }
    
    // 更新版本信息
    updateVersionInfo(releaseData) {
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
                <div class="version-label">发布说明</div>
                <div class="version-value" style="font-size: 1rem;">
                    ${releaseData.body ? Utils.escapeHtml(releaseData.body.substring(0, 100)) + '...' : '无说明'}
                </div>
            </div>
        `;
    }
    
    // 更新文件列表
    updateFilesList(releaseData) {
        const filesContainer = document.getElementById('filesContainer');
        
        if (!releaseData.assets || releaseData.assets.length === 0) {
            filesContainer.innerHTML = '<div class="error">暂无可用文件</div>';
            return;
        }
        
        filesContainer.innerHTML = releaseData.assets
            .map(asset => this.createFileCard(asset))
            .join('');
            
        this.updateCodeBlocks(releaseData.assets);
    }
    
    // 创建文件卡片
    createFileCard(asset) {
        const fileName = asset.name;
        const fileSize = Utils.formatFileSize(asset.size);
        const description = CONFIG.fileDescriptions[fileName] || 'FFmpeg 预构建二进制文件';
        const platformIcon = CONFIG.platformIcons[fileName] || 'fas fa-file-archive';
        const platformLabel = CONFIG.platformLabels[fileName] || '未知平台';
        
        const directUrl = asset.browser_download_url;
        const proxyDownloadUrl = CONFIG.proxyUrl + directUrl;
        
        return `
            <div class="file-card">
                <div class="file-header">
                    <div class="file-name">${Utils.escapeHtml(fileName)}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <div class="file-platform">
                    <i class="${platformIcon}"></i> ${platformLabel}
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
            </div>
        `;
    }
    
    // 更新代码块中的下载链接
    updateCodeBlocks(assets) {
        const linuxCodeBlock = document.getElementById('linux-code');
        if (linuxCodeBlock) {
            const amd64Asset = assets.find(asset => asset.name.includes('amd64-static'));
            if (amd64Asset) {
                const proxyUrl = CONFIG.proxyUrl + amd64Asset.browser_download_url;
                linuxCodeBlock.innerHTML = linuxCodeBlock.innerHTML.replace(
                    'wget [下载链接]',
                    `wget "${proxyUrl}"`
                );
                
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
        const commands = ['wget', 'tar', 'cd', './', 'sudo', 'cp', 'ffmpeg', 'ffprobe'];
        commands.forEach(cmd => {
            const regex = new RegExp(`\\b${cmd}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="keyword">${cmd}</span>`);
        });
        
        // 参数
        highlighted = highlighted.replace(/-[a-zA-Z]+/g, '<span class="parameter">$&</span>');
        
        // 文件路径
        highlighted = highlighted.replace(/\/[\w\/.-]+/g, '<span class="string">$&</span>');
        
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
    
    // 添加平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
        // Ctrl + F 搜索文件
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = '搜索文件...';
            searchInput.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px;
                z-index: 1000;
                border: 2px solid var(--primary-color);
                border-radius: 5px;
                box-shadow: var(--shadow);
            `;
            document.body.appendChild(searchInput);
            searchInput.focus();
            
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const fileCards = document.querySelectorAll('.file-card');
                
                fileCards.forEach(card => {
                    const fileName = card.querySelector('.file-name').textContent.toLowerCase();
                    const description = card.querySelector('.file-description').textContent.toLowerCase();
                    
                    if (fileName.includes(searchTerm) || description.includes(searchTerm)) {
                        card.style.display = 'flex';
                        card.classList.add('highlight');
                        setTimeout(() => card.classList.remove('highlight'), 1000);
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.remove();
                    document.querySelectorAll('.file-card').forEach(card => {
                        card.style.display = 'flex';
                    });
                }
            });
        }
    });
});
