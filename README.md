# PDF编辑器

基于 Wails + pdfcpu + MUI 的PDF编辑器

## 功能特性

### 👁️ PDF查看器
- ✅ 实时PDF预览
- ✅ 页面导航（上一页、下一页、首页、末页）
- ✅ 缩放控制（50% - 300%）
- ✅ 页码显示
- ✅ 可切换查看器/侧边栏视图

### 📁 文件操作
- ✅ 打开PDF文件
- ✅ 另存为
- ✅ 关闭文件

### ✂️ 编辑功能
- ✅ 分割PDF（按页分割）
- ✅ 旋转页面（90°/180°/270°）
- ✅ 删除指定页面
- ✅ 插入空白页
- ✅ 提取指定页面

### 🛠️ 工具功能
- ✅ 合并多个PDF
- ✅ 优化压缩PDF
- ✅ 添加文字水印
- ✅ 移除水印
- ✅ 加密PDF（密码保护）
- ✅ 解密PDF
- ✅ 提取PDF中的图片
- ✅ 查看PDF信息（页数、元数据）

### 🎨 界面特性
- 专业的PDF查看器
- 双栏布局（预览+侧边栏）
- 专业的菜单栏设计
- 类似桌面应用的操作体验
- Material Design风格界面
- 快捷键支持（Ctrl+O, Ctrl+S）
- 响应式设计

## 开发环境要求

- Go 1.21+
- Node.js 18+
- Wails CLI

## 安装

```bash
# 安装Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 安装依赖
go mod download
cd frontend && npm install
```

## 运行

```bash
# 开发模式
wails dev

# 构建
wails build
```

## 技术栈

- **后端**: Go + pdfcpu
- **前端**: React + TypeScript + MUI
- **框架**: Wails v2
