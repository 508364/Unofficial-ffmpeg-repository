Unofficial FFmpeg Repository

这是一个非官方的 FFmpeg 预构建二进制文件仓库，提供方便快捷的 FFmpeg 7.1.1 版本下载。

📦 仓库说明

由于 GitHub 仓库限制上传超过 25MB 的文件，所有 FFmpeg 二进制文件已发布到 https://github.com/508364/Unofficial-ffmpeg-repository/releases 页面。

🎯 可用版本

Windows

• 文件: ffmpeg-7.1.1-essentials_build.zip

• 来源: 官方 FFmpeg Windows 构建

• 包含组件:

  • ffmpeg.exe (主程序)

  • ffprobe.exe (媒体分析工具)

  • ffplay.exe (媒体播放器)

• 架构: x86_64 (64位)

• 特点: 包含最常用的编解码器和功能

Linux

提供多个架构的静态链接版本，无需额外依赖即可运行：

架构 文件名 说明

x86_64 ffmpeg-release-amd64-static.tar.xz 标准 64 位 PC

i686 ffmpeg-release-i686-static.tar.xz 32 位 PC

ARM64 ffmpeg-release-arm64-static.tar.xz 64 位 ARM 设备

ARMHF ffmpeg-release-armhf-static.tar.xz 硬浮点 ARM 设备

ARMEL ffmpeg-release-armel-static.tar.xz 软浮点 ARM 设备

📥 下载方式

方法1: 直接下载 Releases

访问 https://github.com/508364/Unofficial-ffmpeg-repository/releases 下载所需版本。

方法2: 使用 wget/curl (Linux)

# 下载 Linux amd64 版本
wget https://github.com/508364/Unofficial-ffmpeg-repository/releases/download/v7.1.1/ffmpeg-release-amd64-static.tar.xz

# 下载 Windows 版本
wget https://github.com/508364/Unofficial-ffmpeg-repository/releases/download/v7.1.1/ffmpeg-7.1.1-essentials_build.zip


方法3: 使用 PowerShell (Windows)

# 使用 PowerShell 下载
Invoke-WebRequest -Uri "https://github.com/508364/Unofficial-ffmpeg-repository/releases/download/v7.1.1/ffmpeg-7.1.1-essentials_build.zip" -OutFile "ffmpeg.zip"


🔧 安装说明

Windows

1. 下载 ffmpeg-7.1.1-essentials_build.zip
2. 解压到任意目录
3. 将 bin 目录添加到系统 PATH 环境变量
4. 或在命令行中直接使用完整路径

Linux

# 下载并解压
wget https://github.com/508364/Unofficial-ffmpeg-repository/releases/download/v7.1.1/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
cd ffmpeg-7.1.1-amd64-static/

# 运行 FFmpeg
./ffmpeg

# 安装到系统路径
sudo cp ffmpeg ffprobe /usr/local/bin/


📁 文件结构

Windows ZIP 内容


ffmpeg-7.1.1-essentials_build/
├── bin/
│   ├── ffmpeg.exe
│   ├── ffprobe.exe
│   └── ffplay.exe
├── doc/
└── presets/


Linux 压缩包内容


ffmpeg-7.1.1-amd64-static/
├── ffmpeg
├── ffprobe
├── ffplay
├── manpages/
├── model/
└── README.txt


⚙️ 验证安装

安装后，运行以下命令验证：
# 检查版本
ffmpeg -version

# 查看支持的编解码器
ffmpeg -codecs

# 测试基本功能
ffmpeg -i input.mp4 output.avi


🔄 版本信息

• FFmpeg 版本: 7.1.1

• 构建类型: 静态链接 (Linux)，独立可执行文件 (Windows)

• 构建日期: 2024年

• 许可证: GPL/LGPL，包含的库可能使用不同许可证

⚠️ 注意事项

1. 这些是非官方构建，适用于个人使用和开发测试
2. 生产环境建议从官方渠道获取 FFmpeg
3. 静态链接版本可能不包含所有编解码器
4. ARM 版本主要用于嵌入式设备和树莓派等平台

📄 许可证

本仓库仅提供 FFmpeg 二进制文件的镜像下载。FFmpeg 本身遵循 GPL/LGPL 许可证，具体取决于配置选项。使用前请了解相关许可证条款。

🆘 故障排除

常见问题

1. "ffmpeg: command not found"
   • 确保已添加 FFmpeg 到 PATH

   • 或使用完整路径运行

2. 权限被拒绝 (Linux)
   chmod +x ffmpeg
   

3. 缺少依赖库 (Linux 动态版本)
   • 本仓库提供的 Linux 版本为静态链接，无需外部依赖

🔗 相关链接

• https://ffmpeg.org/

• https://ffmpeg.org/download.html

• https://ffmpeg.org/documentation.html

🤝 贡献

本仓库仅作为二进制文件的分发点，不接收代码贡献。如需报告问题或请求特定版本，请通过 Issues 页面联系。

免责声明: 本仓库提供的二进制文件来源于官方 FFmpeg 构建，但维护者不对其功能完整性或适用性作任何保证。使用者需自行承担风险。
