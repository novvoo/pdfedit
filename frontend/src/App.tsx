import { useState } from 'react'
import {
  Box,
  Button,
  Container,
  Typography,
  Stack,
  Card,
  CardContent,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  PictureAsPdf,
  MergeType,
  ContentCut,
  Info,
  FolderOpen,
  Close,
  TextFields,
  Visibility,
  ViewSidebar,
  Image,
  FirstPage,
  LastPage,
  NavigateBefore,
  NavigateNext,
  Comment,
  Link,
  Help,
  Fullscreen,
  GridView,
  ViewList,
  FileCopy,
  Undo,
  Redo,
  SelectAll,
  ContentCopy,
  Code,
  Description,
  PhotoSizeSelectLarge,
  Article,
} from '@mui/icons-material'
import {
  OpenPDF,
  ClosePDF,
  GetPDFInfo,
  MergePDFs,
  SplitPDF,
  ExtractAllText,
  ExtractText,
  SelectPDFFiles,
  SelectOutputFile,
  SelectOutputDirectory,
  ExportToText,
  ExportToMarkdown,
  ExtractMarkdown,
  ExtractPageMarkdown,
  GetAnnotations,
  GetLinks,
  RenderPageToFile,
  ExtractSinglePage,
  GetMetadata,
} from '../wailsjs/go/main/App'
import GoPDFViewer from './GoPDFViewer'

function App() {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [pdfInfo, setPdfInfo] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  
  // 菜单锚点
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null)
  const [editMenuAnchor, setEditMenuAnchor] = useState<null | HTMLElement>(null)
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null)
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null)
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null)
  const [helpMenuAnchor, setHelpMenuAnchor] = useState<null | HTMLElement>(null)
  
  // 对话框状态
  const [infoDialog, setInfoDialog] = useState(false)
  const [textDialog, setTextDialog] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [annotationsDialog, setAnnotationsDialog] = useState(false)
  const [annotations, setAnnotations] = useState<any[]>([])
  const [linksDialog, setLinksDialog] = useState(false)
  const [links, setLinks] = useState<any[]>([])
  const [metadataDialog, setMetadataDialog] = useState(false)
  const [metadata, setMetadata] = useState('')
  const [pageTextDialog, setPageTextDialog] = useState(false)
  const [pageText, setPageText] = useState('')
  const [aboutDialog, setAboutDialog] = useState(false)
  const [markdownDialog, setMarkdownDialog] = useState(false)
  const [extractedMarkdown, setExtractedMarkdown] = useState('')
  const [pageMarkdownDialog, setPageMarkdownDialog] = useState(false)
  const [pageMarkdown, setPageMarkdown] = useState('')
  
  // 加载和通知状态
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' })
  
  // 视图状态
  const [showViewer, setShowViewer] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single')
  
  const showMessage = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity })
  }
  
  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  const handleOpenPDF = async () => {
    setLoading(true)
    try {
      const file = await OpenPDF()
      if (file) {
        setSelectedFile(file)
        const info = await GetPDFInfo(file)
        setPdfInfo(info)
        setCurrentPage(1)
        showMessage('PDF文件打开成功', 'success')
      }
    } catch (error) {
      showMessage(`打开PDF失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setFileMenuAnchor(null)
    }
  }

  const handleCloseFile = async () => {
    try {
      await ClosePDF()
      setSelectedFile('')
      setPdfInfo(null)
      setCurrentPage(1)
      setFileMenuAnchor(null)
      showMessage('文件已关闭', 'info')
    } catch (error) {
      showMessage(`关闭文件失败: ${error}`, 'error')
    }
  }

  const handleMerge = async () => {
    setLoading(true)
    try {
      const files = await SelectPDFFiles()
      if (!files || files.length === 0) {
        setLoading(false)
        return
      }
      const outputPath = await SelectOutputFile('merged.pdf', 'pdf')
      if (!outputPath) {
        setLoading(false)
        return
      }
      await MergePDFs(files, outputPath)
      showMessage(`PDF合并成功！保存到: ${outputPath}`, 'success')
    } catch (error) {
      showMessage(`合并失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const handleSplit = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const dir = await SelectOutputDirectory()
      if (!dir) {
        setLoading(false)
        return
      }
      const outputFiles = await SplitPDF(selectedFile, dir)
      showMessage(`PDF已分割为 ${outputFiles.length} 个文件到: ${dir}`, 'success')
    } catch (error) {
      showMessage(`分割失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setEditMenuAnchor(null)
    }
  }

  const handleExtractText = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const text = await ExtractAllText(selectedFile)
      setExtractedText(text)
      setTextDialog(true)
    } catch (error) {
      showMessage(`提取文本失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const handleExtractPageText = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const text = await ExtractText(selectedFile, currentPage)
      setPageText(text)
      setPageTextDialog(true)
    } catch (error) {
      showMessage(`提取当前页文本失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const handleExportText = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const outputPath = await SelectOutputFile('output.txt', 'text')
      if (!outputPath) {
        setLoading(false)
        return
      }
      await ExportToText(selectedFile, outputPath)
      showMessage(`文本已导出到: ${outputPath}`, 'success')
    } catch (error) {
      showMessage(`导出失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setExportMenuAnchor(null)
    }
  }

  const handleExportMarkdown = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const outputPath = await SelectOutputFile('output.md', 'markdown')
      if (!outputPath) {
        setLoading(false)
        return
      }
      await ExportToMarkdown(selectedFile, outputPath, false)
      showMessage(`Markdown已导出到: ${outputPath}`, 'success')
    } catch (error) {
      showMessage(`导出Markdown失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setExportMenuAnchor(null)
    }
  }

  const handleExtractMarkdown = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const markdown = await ExtractMarkdown(selectedFile, false)
      setExtractedMarkdown(markdown)
      setMarkdownDialog(true)
    } catch (error) {
      showMessage(`提取Markdown失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const handleExtractPageMarkdown = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const markdown = await ExtractPageMarkdown(selectedFile, currentPage, false)
      setPageMarkdown(markdown)
      setPageMarkdownDialog(true)
    } catch (error) {
      showMessage(`提取当前页Markdown失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const handleExportPageAsImage = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const outputPath = await SelectOutputFile(`page_${currentPage}.png`, 'pdf')
      if (!outputPath) {
        setLoading(false)
        return
      }
      await RenderPageToFile(selectedFile, currentPage, outputPath, 300, 'png')
      showMessage(`页面已导出为图片: ${outputPath}`, 'success')
    } catch (error) {
      showMessage(`导出图片失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setExportMenuAnchor(null)
    }
  }

  const handleExtractCurrentPage = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const outputPath = await SelectOutputFile(`page_${currentPage}.pdf`, 'pdf')
      if (!outputPath) {
        setLoading(false)
        return
      }
      await ExtractSinglePage(selectedFile, currentPage, outputPath)
      showMessage(`当前页已提取到: ${outputPath}`, 'success')
    } catch (error) {
      showMessage(`提取页面失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setEditMenuAnchor(null)
    }
  }

  const handleShowInfo = () => {
    setInfoDialog(true)
    setToolsMenuAnchor(null)
  }

  const handleShowAnnotations = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const annots = await GetAnnotations(selectedFile, currentPage)
      setAnnotations(annots || [])
      setAnnotationsDialog(true)
    } catch (error) {
      showMessage(`获取注释失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const handleShowLinks = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const pageLinks = await GetLinks(selectedFile, currentPage)
      setLinks(pageLinks || [])
      setLinksDialog(true)
    } catch (error) {
      showMessage(`获取链接失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const handleShowMetadata = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const meta = await GetMetadata(selectedFile)
      setMetadata(meta || '无元数据')
      setMetadataDialog(true)
    } catch (error) {
      showMessage(`获取元数据失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const getFileName = (path: string) => {
    return path.split('\\').pop()?.split('/').pop() || path
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (pdfInfo?.numPages || 1)) {
      setCurrentPage(page)
    }
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部菜单栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 0.5,
          bgcolor: '#1976d2',
          color: 'white',
          minHeight: 48,
        }}
      >
        <PictureAsPdf sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ mr: 4 }}>
          PDF编辑器
        </Typography>
        
        {/* 菜单栏 */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            color="inherit"
            onClick={(e) => setFileMenuAnchor(e.currentTarget)}
            sx={{ textTransform: 'none', minWidth: 'auto', px: 1.5 }}
          >
            文件
          </Button>
          <Button
            color="inherit"
            onClick={(e) => setEditMenuAnchor(e.currentTarget)}
            sx={{ textTransform: 'none', minWidth: 'auto', px: 1.5 }}
          >
            编辑
          </Button>
          <Button
            color="inherit"
            onClick={(e) => setViewMenuAnchor(e.currentTarget)}
            sx={{ textTransform: 'none', minWidth: 'auto', px: 1.5 }}
          >
            视图
          </Button>
          <Button
            color="inherit"
            onClick={(e) => setToolsMenuAnchor(e.currentTarget)}
            sx={{ textTransform: 'none', minWidth: 'auto', px: 1.5 }}
          >
            工具
          </Button>
          <Button
            color="inherit"
            onClick={(e) => setExportMenuAnchor(e.currentTarget)}
            disabled={!selectedFile}
            sx={{ textTransform: 'none', minWidth: 'auto', px: 1.5 }}
          >
            导出
          </Button>
          <Button
            color="inherit"
            onClick={(e) => setHelpMenuAnchor(e.currentTarget)}
            sx={{ textTransform: 'none', minWidth: 'auto', px: 1.5 }}
          >
            帮助
          </Button>
        </Box>

        {/* 工具栏快捷按钮 */}
        {selectedFile && (
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="第一页">
              <IconButton color="inherit" size="small" onClick={() => goToPage(1)} disabled={currentPage <= 1}>
                <FirstPage />
              </IconButton>
            </Tooltip>
            <Tooltip title="上一页">
              <IconButton color="inherit" size="small" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
                <NavigateBefore />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ mx: 1 }}>
              {currentPage} / {pdfInfo?.numPages || 0}
            </Typography>
            <Tooltip title="下一页">
              <IconButton color="inherit" size="small" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= (pdfInfo?.numPages || 1)}>
                <NavigateNext />
              </IconButton>
            </Tooltip>
            <Tooltip title="最后一页">
              <IconButton color="inherit" size="small" onClick={() => goToPage(pdfInfo?.numPages || 1)} disabled={currentPage >= (pdfInfo?.numPages || 1)}>
                <LastPage />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 1, bgcolor: 'rgba(255,255,255,0.3)' }} />
            <Tooltip title="文档信息">
              <IconButton color="inherit" size="small" onClick={handleShowInfo}>
                <Info />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* 文件菜单 */}
      <Menu
        anchorEl={fileMenuAnchor}
        open={Boolean(fileMenuAnchor)}
        onClose={() => setFileMenuAnchor(null)}
      >
        <MenuItem onClick={handleOpenPDF}>
          <ListItemIcon><FolderOpen fontSize="small" /></ListItemIcon>
          <ListItemText>打开...</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>⌘O</Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleCloseFile} disabled={!selectedFile}>
          <ListItemIcon><Close fontSize="small" /></ListItemIcon>
          <ListItemText>关闭</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>⌘W</Typography>
        </MenuItem>
      </Menu>

      {/* 编辑菜单 */}
      <Menu
        anchorEl={editMenuAnchor}
        open={Boolean(editMenuAnchor)}
        onClose={() => setEditMenuAnchor(null)}
      >
        <MenuItem disabled>
          <ListItemIcon><Undo fontSize="small" /></ListItemIcon>
          <ListItemText>撤销</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>⌘Z</Typography>
        </MenuItem>
        <MenuItem disabled>
          <ListItemIcon><Redo fontSize="small" /></ListItemIcon>
          <ListItemText>重做</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>⇧⌘Z</Typography>
        </MenuItem>
        <Divider />
        <MenuItem disabled>
          <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
          <ListItemText>复制</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>⌘C</Typography>
        </MenuItem>
        <MenuItem disabled>
          <ListItemIcon><SelectAll fontSize="small" /></ListItemIcon>
          <ListItemText>全选</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>⌘A</Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleExtractCurrentPage} disabled={!selectedFile}>
          <ListItemIcon><FileCopy fontSize="small" /></ListItemIcon>
          <ListItemText>提取当前页...</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSplit} disabled={!selectedFile}>
          <ListItemIcon><ContentCut fontSize="small" /></ListItemIcon>
          <ListItemText>分割所有页面...</ListItemText>
        </MenuItem>
      </Menu>

      {/* 视图菜单 */}
      <Menu
        anchorEl={viewMenuAnchor}
        open={Boolean(viewMenuAnchor)}
        onClose={() => setViewMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setShowViewer(!showViewer); setViewMenuAnchor(null) }}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>{showViewer ? '隐藏预览' : '显示预览'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setShowSidebar(!showSidebar); setViewMenuAnchor(null) }}>
          <ListItemIcon><ViewSidebar fontSize="small" /></ListItemIcon>
          <ListItemText>{showSidebar ? '隐藏侧边栏' : '显示侧边栏'}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setViewMode('single'); setViewMenuAnchor(null) }} selected={viewMode === 'single'}>
          <ListItemIcon><ViewList fontSize="small" /></ListItemIcon>
          <ListItemText>单页视图</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setViewMode('grid'); setViewMenuAnchor(null) }} selected={viewMode === 'grid'} disabled>
          <ListItemIcon><GridView fontSize="small" /></ListItemIcon>
          <ListItemText>网格视图</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem disabled>
          <ListItemIcon><Fullscreen fontSize="small" /></ListItemIcon>
          <ListItemText>全屏</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>F11</Typography>
        </MenuItem>
      </Menu>

      {/* 工具菜单 */}
      <Menu
        anchorEl={toolsMenuAnchor}
        open={Boolean(toolsMenuAnchor)}
        onClose={() => setToolsMenuAnchor(null)}
      >
        <MenuItem onClick={handleMerge}>
          <ListItemIcon><MergeType fontSize="small" /></ListItemIcon>
          <ListItemText>合并PDF...</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleExtractText} disabled={!selectedFile}>
          <ListItemIcon><TextFields fontSize="small" /></ListItemIcon>
          <ListItemText>提取全部文本</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExtractPageText} disabled={!selectedFile}>
          <ListItemIcon><Description fontSize="small" /></ListItemIcon>
          <ListItemText>提取当前页文本</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleExtractMarkdown} disabled={!selectedFile}>
          <ListItemIcon><Article fontSize="small" /></ListItemIcon>
          <ListItemText>提取全部Markdown</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExtractPageMarkdown} disabled={!selectedFile}>
          <ListItemIcon><Article fontSize="small" /></ListItemIcon>
          <ListItemText>提取当前页Markdown</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleShowAnnotations} disabled={!selectedFile}>
          <ListItemIcon><Comment fontSize="small" /></ListItemIcon>
          <ListItemText>查看注释</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleShowLinks} disabled={!selectedFile}>
          <ListItemIcon><Link fontSize="small" /></ListItemIcon>
          <ListItemText>查看链接</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleShowMetadata} disabled={!selectedFile}>
          <ListItemIcon><Code fontSize="small" /></ListItemIcon>
          <ListItemText>查看元数据 (XMP)</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleShowInfo} disabled={!selectedFile}>
          <ListItemIcon><Info fontSize="small" /></ListItemIcon>
          <ListItemText>文档信息</ListItemText>
        </MenuItem>
      </Menu>

      {/* 导出菜单 */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => setExportMenuAnchor(null)}
      >
        <MenuItem onClick={handleExportText}>
          <ListItemIcon><TextFields fontSize="small" /></ListItemIcon>
          <ListItemText>导出为文本文件...</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportMarkdown}>
          <ListItemIcon><Article fontSize="small" /></ListItemIcon>
          <ListItemText>导出为Markdown...</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleExportPageAsImage}>
          <ListItemIcon><Image fontSize="small" /></ListItemIcon>
          <ListItemText>导出当前页为图片...</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem disabled>
          <ListItemIcon><PhotoSizeSelectLarge fontSize="small" /></ListItemIcon>
          <ListItemText>批量导出图片...</ListItemText>
        </MenuItem>
      </Menu>

      {/* 帮助菜单 */}
      <Menu
        anchorEl={helpMenuAnchor}
        open={Boolean(helpMenuAnchor)}
        onClose={() => setHelpMenuAnchor(null)}
      >
        <MenuItem disabled>
          <ListItemIcon><Help fontSize="small" /></ListItemIcon>
          <ListItemText>使用帮助</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAboutDialog(true); setHelpMenuAnchor(null) }}>
          <ListItemIcon><Info fontSize="small" /></ListItemIcon>
          <ListItemText>关于</ListItemText>
        </MenuItem>
      </Menu>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {!selectedFile ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
              bgcolor: '#fafafa',
            }}
          >
            <PictureAsPdf sx={{ fontSize: 80, color: 'text.secondary' }} />
            <Typography variant="h5" color="text.secondary">
              打开PDF文件开始编辑
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<FolderOpen />}
              onClick={handleOpenPDF}
            >
              打开文件
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              支持的功能：查看、分割、合并、提取文本、导出图片
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* PDF 查看区域 */}
            {showViewer && selectedFile && pdfInfo && (
              <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <GoPDFViewer 
                  file={selectedFile}
                  totalPages={pdfInfo.numPages || 0}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </Box>
            )}

            {/* 侧边栏 */}
            {showSidebar && (
              <Box
                sx={{
                  width: showViewer ? 320 : '100%',
                  borderLeft: showViewer ? '1px solid #e0e0e0' : 'none',
                  overflow: 'auto',
                  bgcolor: '#fafafa',
                }}
              >
                <Container maxWidth={false} sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Card variant="outlined">
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          当前文件
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                          {getFileName(selectedFile)}
                        </Typography>
                      </CardContent>
                    </Card>

                    {pdfInfo && (
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            文档信息
                          </Typography>
                          <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">页数</Typography>
                              <Chip label={`${pdfInfo.numPages} 页`} size="small" color="primary" />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">版本</Typography>
                              <Typography variant="body2">{pdfInfo.version}</Typography>
                            </Box>
                            {pdfInfo.title && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">标题</Typography>
                                <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {pdfInfo.title}
                                </Typography>
                              </Box>
                            )}
                            {pdfInfo.author && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">作者</Typography>
                                <Typography variant="body2">{pdfInfo.author}</Typography>
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                              {pdfInfo.encrypted && <Chip label="加密" size="small" color="warning" />}
                              {pdfInfo.tagged && <Chip label="标签" size="small" />}
                              {pdfInfo.hasForms && <Chip label="表单" size="small" color="info" />}
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    )}

                    {/* 快捷操作 */}
                    <Card variant="outlined">
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          快捷操作
                        </Typography>
                        <Stack spacing={1}>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            startIcon={<ContentCut />}
                            onClick={handleSplit}
                          >
                            分割所有页面
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            startIcon={<FileCopy />}
                            onClick={handleExtractCurrentPage}
                          >
                            提取当前页
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            startIcon={<MergeType />}
                            onClick={handleMerge}
                          >
                            合并PDF
                          </Button>
                          <Divider />
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            startIcon={<TextFields />}
                            onClick={handleExtractText}
                          >
                            提取全部文本
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            startIcon={<Article />}
                            onClick={handleExtractMarkdown}
                          >
                            提取全部Markdown
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            startIcon={<Image />}
                            onClick={handleExportPageAsImage}
                          >
                            导出当前页为图片
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>
                </Container>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* 文档信息对话框 */}
      <Dialog open={infoDialog} onClose={() => setInfoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>文档信息</DialogTitle>
        <DialogContent>
          {pdfInfo && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Box><strong>路径:</strong> {pdfInfo.path}</Box>
              <Box><strong>页数:</strong> {pdfInfo.numPages}</Box>
              <Box><strong>版本:</strong> {pdfInfo.version}</Box>
              {pdfInfo.title && <Box><strong>标题:</strong> {pdfInfo.title}</Box>}
              {pdfInfo.author && <Box><strong>作者:</strong> {pdfInfo.author}</Box>}
              {pdfInfo.subject && <Box><strong>主题:</strong> {pdfInfo.subject}</Box>}
              {pdfInfo.keywords && <Box><strong>关键词:</strong> {pdfInfo.keywords}</Box>}
              {pdfInfo.creator && <Box><strong>创建程序:</strong> {pdfInfo.creator}</Box>}
              {pdfInfo.producer && <Box><strong>PDF生成器:</strong> {pdfInfo.producer}</Box>}
              {pdfInfo.creationDate && <Box><strong>创建日期:</strong> {pdfInfo.creationDate}</Box>}
              {pdfInfo.modDate && <Box><strong>修改日期:</strong> {pdfInfo.modDate}</Box>}
              <Box><strong>加密:</strong> {pdfInfo.encrypted ? '是' : '否'}</Box>
              <Box><strong>标签:</strong> {pdfInfo.tagged ? '是' : '否'}</Box>
              <Box><strong>表单:</strong> {pdfInfo.hasForms ? '是' : '否'}</Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 提取文本对话框 */}
      <Dialog open={textDialog} onClose={() => setTextDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>提取的文本（全部页面）</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            rows={20}
            value={extractedText}
            InputProps={{ readOnly: true }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigator.clipboard.writeText(extractedText)}>复制</Button>
          <Button onClick={() => setTextDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 当前页文本对话框 */}
      <Dialog open={pageTextDialog} onClose={() => setPageTextDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>第 {currentPage} 页文本</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            rows={15}
            value={pageText}
            InputProps={{ readOnly: true }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigator.clipboard.writeText(pageText)}>复制</Button>
          <Button onClick={() => setPageTextDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* Markdown 对话框 */}
      <Dialog open={markdownDialog} onClose={() => setMarkdownDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>提取的 Markdown（全部页面）</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            rows={20}
            value={extractedMarkdown}
            InputProps={{ readOnly: true }}
            sx={{ mt: 1, fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigator.clipboard.writeText(extractedMarkdown)}>复制</Button>
          <Button onClick={() => setMarkdownDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 当前页 Markdown 对话框 */}
      <Dialog open={pageMarkdownDialog} onClose={() => setPageMarkdownDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>第 {currentPage} 页 Markdown</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            rows={15}
            value={pageMarkdown}
            InputProps={{ readOnly: true }}
            sx={{ mt: 1, fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigator.clipboard.writeText(pageMarkdown)}>复制</Button>
          <Button onClick={() => setPageMarkdownDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 注释对话框 */}
      <Dialog open={annotationsDialog} onClose={() => setAnnotationsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>第 {currentPage} 页注释</DialogTitle>
        <DialogContent>
          {annotations.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 2 }}>此页面没有注释</Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {annotations.map((annot, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2">{annot.subtype || '未知类型'}</Typography>
                    {annot.contents && <Typography variant="body2">{annot.contents}</Typography>}
                    {annot.title && <Typography variant="caption" color="text.secondary">作者: {annot.title}</Typography>}
                    {annot.uri && <Typography variant="caption" color="primary" display="block">链接: {annot.uri}</Typography>}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnotationsDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 链接对话框 */}
      <Dialog open={linksDialog} onClose={() => setLinksDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>第 {currentPage} 页链接</DialogTitle>
        <DialogContent>
          {links.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 2 }}>此页面没有链接</Typography>
          ) : (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {links.map((link, index) => (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="body2" color="primary">
                      {link.uri || '内部链接'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      位置: ({link.x.toFixed(0)}, {link.y.toFixed(0)}) - 大小: {link.width.toFixed(0)} x {link.height.toFixed(0)}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinksDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 元数据对话框 */}
      <Dialog open={metadataDialog} onClose={() => setMetadataDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>XMP 元数据</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            rows={15}
            value={metadata}
            InputProps={{ readOnly: true }}
            sx={{ mt: 1, fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigator.clipboard.writeText(metadata)}>复制</Button>
          <Button onClick={() => setMetadataDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 关于对话框 */}
      <Dialog open={aboutDialog} onClose={() => setAboutDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>关于 PDF编辑器</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <PictureAsPdf sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6">PDF编辑器</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              版本 1.0.0
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              基于 Go + Wails + React 构建
            </Typography>
            <Typography variant="body2" color="text.secondary">
              使用 go-poppler 纯 Go PDF 库
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAboutDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 加载指示器 */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
          }}
        >
          <Box sx={{ textAlign: 'center', bgcolor: 'white', p: 4, borderRadius: 2 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>处理中...</Typography>
          </Box>
        </Box>
      )}

      {/* 消息提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default App
