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
} from '@mui/material'
import {
  PictureAsPdf,
  MergeType,
  ContentCut,
  Rotate90DegreesCcw,
  Info,
  FolderOpen,
  Save,
  SaveAs,
  Close,
  Compress,
  TextFields,
  Lock,
  LockOpen,
  Image,
  DeleteOutline,
  AddCircleOutline,
  Visibility,
  ViewSidebar,
} from '@mui/icons-material'
import {
  OpenPDF,
  GetPDFInfo,
  SaveAs as SaveAsFile,
  OptimizePDF,
  AddWatermark,
  RemoveWatermark,
  EncryptPDF,
  DecryptPDF,
  ExtractImages,
  RotatePages,
  SelectMultiplePDFs,
  MergePDFs,
  SelectDirectory,
  SplitPDF,
  GetPDFOutline,
} from '../wailsjs/go/main/App'
import GoPDFViewer from './GoPDFViewer'
import LayerBasedEditor from './LayerBasedEditor'
import OutlinePanel from './OutlinePanel'

function App() {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [pdfInfo, setPdfInfo] = useState<any>(null)
  const [outline, setOutline] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null)
  const [editMenuAnchor, setEditMenuAnchor] = useState<null | HTMLElement>(null)
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null)
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null)
  
  // 对话框状态
  const [watermarkDialog, setWatermarkDialog] = useState(false)
  const [watermarkText, setWatermarkText] = useState('')
  const [rotateDialog, setRotateDialog] = useState(false)
  const [rotationAngle, setRotationAngle] = useState('90')
  const [encryptDialog, setEncryptDialog] = useState(false)
  const [userPassword, setUserPassword] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [decryptDialog, setDecryptDialog] = useState(false)
  const [decryptPassword, setDecryptPassword] = useState('')
  
  // 加载和通知状态
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' })
  
  // 视图状态
  const [showViewer, setShowViewer] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [editMode, setEditMode] = useState(true) // 默认编辑模式
  
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
        // 获取PDF大纲
        try {
          const outlineData = await GetPDFOutline(file)
          setOutline(outlineData || [])
        } catch (e) {
          console.log('获取大纲失败:', e)
          setOutline([])
        }
        setCurrentPage(1)
        showMessage('PDF文件打开成功 (Go渲染模式)', 'success')
      }
    } catch (error) {
      showMessage(`打开PDF失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setFileMenuAnchor(null)
    }
  }

  const handleCloseFile = () => {
    setSelectedFile('')
    setPdfInfo(null)
    setOutline([])
    setCurrentPage(1)
    setFileMenuAnchor(null)
    showMessage('文件已关闭', 'info')
  }

  const handleSaveAs = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const newPath = await SaveAsFile(selectedFile)
      if (newPath) {
        showMessage(`文件已保存到: ${newPath}`, 'success')
      }
    } catch (error) {
      showMessage(`保存失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setFileMenuAnchor(null)
    }
  }

  const handleOptimize = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      await OptimizePDF(selectedFile)
      showMessage('PDF优化成功！文件大小已减小', 'success')
    } catch (error) {
      showMessage(`优化失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const handleAddWatermarkClick = () => {
    setToolsMenuAnchor(null)
    setWatermarkDialog(true)
  }

  const handleAddWatermarkConfirm = async () => {
    if (!selectedFile || !watermarkText) return
    setLoading(true)
    setWatermarkDialog(false)
    try {
      await AddWatermark(selectedFile, watermarkText)
      showMessage('水印添加成功！', 'success')
      setWatermarkText('')
    } catch (error) {
      showMessage(`添加水印失败: ${error}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveWatermark = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      await RemoveWatermark(selectedFile)
      showMessage('水印移除成功！', 'success')
    } catch (error) {
      showMessage(`移除水印失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const handleEncryptClick = () => {
    setToolsMenuAnchor(null)
    setEncryptDialog(true)
  }

  const handleEncryptConfirm = async () => {
    if (!selectedFile || !userPassword || !ownerPassword) return
    setLoading(true)
    setEncryptDialog(false)
    try {
      await EncryptPDF(selectedFile, userPassword, ownerPassword)
      showMessage('PDF加密成功！', 'success')
      setUserPassword('')
      setOwnerPassword('')
    } catch (error) {
      showMessage(`加密失败: ${error}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDecryptClick = () => {
    setToolsMenuAnchor(null)
    setDecryptDialog(true)
  }

  const handleDecryptConfirm = async () => {
    if (!selectedFile || !decryptPassword) return
    setLoading(true)
    setDecryptDialog(false)
    try {
      await DecryptPDF(selectedFile, decryptPassword)
      showMessage('PDF解密成功！', 'success')
      setDecryptPassword('')
    } catch (error) {
      showMessage(`解密失败: ${error}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleExtractImages = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const dir = await SelectDirectory()
      if (!dir) {
        setLoading(false)
        return
      }
      await ExtractImages(selectedFile, dir)
      showMessage(`图片已提取到: ${dir}`, 'success')
    } catch (error) {
      showMessage(`提取图片失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setToolsMenuAnchor(null)
    }
  }

  const handleRotateClick = () => {
    setEditMenuAnchor(null)
    setRotateDialog(true)
  }

  const handleRotateConfirm = async () => {
    if (!selectedFile) return
    setLoading(true)
    setRotateDialog(false)
    try {
      await RotatePages(selectedFile, parseInt(rotationAngle))
      // 重新加载PDF信息
      const info = await GetPDFInfo(selectedFile)
      setPdfInfo(info)
      // 刷新当前页面显示
      setCurrentPage(prev => prev)
      showMessage('页面旋转成功！', 'success')
    } catch (error) {
      showMessage(`旋转失败: ${error}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = async () => {
    setLoading(true)
    try {
      const files = await SelectMultiplePDFs()
      if (!files || files.length === 0) {
        setLoading(false)
        return
      }
      const outputPath = await SaveAsFile(files[0])
      if (!outputPath) {
        setLoading(false)
        return
      }
      await MergePDFs(outputPath, files)
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
      const dir = await SelectDirectory()
      if (!dir) {
        setLoading(false)
        return
      }
      await SplitPDF(selectedFile, dir)
      showMessage(`PDF已分割到: ${dir}`, 'success')
    } catch (error) {
      showMessage(`分割失败: ${error}`, 'error')
    } finally {
      setLoading(false)
      setEditMenuAnchor(null)
    }
  }

  const getFileName = (path: string) => {
    return path.split('\\').pop()?.split('/').pop() || path
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部菜单栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            color="inherit"
            onClick={(e) => setFileMenuAnchor(e.currentTarget)}
            sx={{ textTransform: 'none' }}
          >
            文件
          </Button>
          <Button
            color="inherit"
            onClick={(e) => setEditMenuAnchor(e.currentTarget)}
            disabled={!selectedFile}
            sx={{ textTransform: 'none' }}
          >
            编辑
          </Button>
          <Button
            color="inherit"
            onClick={(e) => setToolsMenuAnchor(e.currentTarget)}
            disabled={!selectedFile}
            sx={{ textTransform: 'none' }}
          >
            工具
          </Button>
          <Button
            color="inherit"
            onClick={(e) => setViewMenuAnchor(e.currentTarget)}
            disabled={!selectedFile}
            sx={{ textTransform: 'none' }}
          >
            视图
          </Button>
        </Box>
      </Box>

      {/* 文件菜单 */}
      <Menu
        anchorEl={fileMenuAnchor}
        open={Boolean(fileMenuAnchor)}
        onClose={() => setFileMenuAnchor(null)}
      >
        <MenuItem onClick={handleOpenPDF}>
          <ListItemIcon>
            <FolderOpen fontSize="small" />
          </ListItemIcon>
          <ListItemText>打开...</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            Ctrl+O
          </Typography>
        </MenuItem>
        <MenuItem disabled={!selectedFile}>
          <ListItemIcon>
            <Save fontSize="small" />
          </ListItemIcon>
          <ListItemText>保存</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            Ctrl+S
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleSaveAs} disabled={!selectedFile}>
          <ListItemIcon>
            <SaveAs fontSize="small" />
          </ListItemIcon>
          <ListItemText>另存为...</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleCloseFile} disabled={!selectedFile}>
          <ListItemIcon>
            <Close fontSize="small" />
          </ListItemIcon>
          <ListItemText>关闭</ListItemText>
        </MenuItem>
      </Menu>

      {/* 编辑菜单 */}
      <Menu
        anchorEl={editMenuAnchor}
        open={Boolean(editMenuAnchor)}
        onClose={() => setEditMenuAnchor(null)}
      >
        <MenuItem onClick={handleSplit}>
          <ListItemIcon>
            <ContentCut fontSize="small" />
          </ListItemIcon>
          <ListItemText>分割页面...</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleRotateClick}>
          <ListItemIcon>
            <Rotate90DegreesCcw fontSize="small" />
          </ListItemIcon>
          <ListItemText>旋转页面...</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setEditMenuAnchor(null)}>
          <ListItemIcon>
            <DeleteOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>删除页面...</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setEditMenuAnchor(null)}>
          <ListItemIcon>
            <AddCircleOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>插入空白页...</ListItemText>
        </MenuItem>
      </Menu>

      {/* 视图菜单 */}
      <Menu
        anchorEl={viewMenuAnchor}
        open={Boolean(viewMenuAnchor)}
        onClose={() => setViewMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setShowViewer(!showViewer); setViewMenuAnchor(null) }}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>{showViewer ? '隐藏预览' : '显示预览'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setShowSidebar(!showSidebar); setViewMenuAnchor(null) }}>
          <ListItemIcon>
            <ViewSidebar fontSize="small" />
          </ListItemIcon>
          <ListItemText>{showSidebar ? '隐藏侧边栏' : '显示侧边栏'}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setEditMode(!editMode); setViewMenuAnchor(null) }}>
          <ListItemIcon>
            <TextFields fontSize="small" />
          </ListItemIcon>
          <ListItemText>{editMode ? '查看模式' : '编辑模式'}</ListItemText>
          {editMode && (
            <Chip label="当前" size="small" color="primary" sx={{ ml: 1 }} />
          )}
        </MenuItem>

      </Menu>

      {/* 工具菜单 */}
      <Menu
        anchorEl={toolsMenuAnchor}
        open={Boolean(toolsMenuAnchor)}
        onClose={() => setToolsMenuAnchor(null)}
      >
        <MenuItem onClick={handleMerge}>
          <ListItemIcon>
            <MergeType fontSize="small" />
          </ListItemIcon>
          <ListItemText>合并PDF...</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOptimize}>
          <ListItemIcon>
            <Compress fontSize="small" />
          </ListItemIcon>
          <ListItemText>优化压缩</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleAddWatermarkClick}>
          <ListItemIcon>
            <TextFields fontSize="small" />
          </ListItemIcon>
          <ListItemText>添加水印...</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleRemoveWatermark}>
          <ListItemIcon>
            <TextFields fontSize="small" />
          </ListItemIcon>
          <ListItemText>移除水印</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleEncryptClick}>
          <ListItemIcon>
            <Lock fontSize="small" />
          </ListItemIcon>
          <ListItemText>加密PDF...</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDecryptClick}>
          <ListItemIcon>
            <LockOpen fontSize="small" />
          </ListItemIcon>
          <ListItemText>解密PDF...</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleExtractImages}>
          <ListItemIcon>
            <Image fontSize="small" />
          </ListItemIcon>
          <ListItemText>提取图片...</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setToolsMenuAnchor(null)}>
          <ListItemIcon>
            <Info fontSize="small" />
          </ListItemIcon>
          <ListItemText>文档信息</ListItemText>
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
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* PDF 查看/编辑区域 */}
            {showViewer && selectedFile && pdfInfo && (
              <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {editMode ? (
                  <LayerBasedEditor
                    file={selectedFile}
                    totalPages={pdfInfo.pageCount || 0}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                  />
                ) : (
                  <GoPDFViewer 
                    file={selectedFile}
                    totalPages={pdfInfo.pageCount || 0}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                  />
                )}
              </Box>
            )}

            {/* 侧边栏 */}
            {showSidebar && (
              <Box
                sx={{
                  width: showViewer ? 350 : '100%',
                  borderLeft: showViewer ? '1px solid #e0e0e0' : 'none',
                  overflow: 'auto',
                  bgcolor: '#fafafa',
                }}
              >
                <Container maxWidth={false} sx={{ p: 3 }}>
                  <Stack spacing={3}>
              {/* 目录大纲 */}
              {pdfInfo && (
                <OutlinePanel 
                  outline={outline}
                  currentPage={currentPage}
                  totalPages={pdfInfo.pageCount}
                  onPageSelect={setCurrentPage}
                />
              )}

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    当前文件
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedFile}
                  </Typography>
                </CardContent>
              </Card>

              {pdfInfo && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      PDF信息
                    </Typography>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          文件名:
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {getFileName(selectedFile)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          页数:
                        </Typography>
                        <Chip label={`${pdfInfo.pageCount} 页`} size="small" color="primary" />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* 快捷操作 */}
              {selectedFile && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      快捷操作
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<Rotate90DegreesCcw />}
                        onClick={handleRotateClick}
                        sx={{ minWidth: 120 }}
                      >
                        旋转
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<ContentCut />}
                        onClick={handleSplit}
                        sx={{ minWidth: 120 }}
                      >
                        分割
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Compress />}
                        onClick={handleOptimize}
                        sx={{ minWidth: 120 }}
                      >
                        优化
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<TextFields />}
                        onClick={handleAddWatermarkClick}
                        sx={{ minWidth: 120 }}
                      >
                        水印
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Lock />}
                        onClick={handleEncryptClick}
                        sx={{ minWidth: 120 }}
                      >
                        加密
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Image />}
                        onClick={handleExtractImages}
                        sx={{ minWidth: 120 }}
                      >
                        提取图片
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}
                  </Stack>
                </Container>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* 水印对话框 */}
      <Dialog open={watermarkDialog} onClose={() => setWatermarkDialog(false)}>
        <DialogTitle>添加水印</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="水印文字"
            fullWidth
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            placeholder="请输入水印文字"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWatermarkDialog(false)}>取消</Button>
          <Button onClick={handleAddWatermarkConfirm} variant="contained" disabled={!watermarkText}>
            确定
          </Button>
        </DialogActions>
      </Dialog>

      {/* 旋转对话框 */}
      <Dialog open={rotateDialog} onClose={() => setRotateDialog(false)}>
        <DialogTitle>旋转页面</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" gutterBottom>
              选择旋转角度:
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              {['90', '180', '270'].map((angle) => (
                <Button
                  key={angle}
                  variant={rotationAngle === angle ? 'contained' : 'outlined'}
                  onClick={() => setRotationAngle(angle)}
                >
                  {angle}°
                </Button>
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRotateDialog(false)}>取消</Button>
          <Button onClick={handleRotateConfirm} variant="contained">
            确定
          </Button>
        </DialogActions>
      </Dialog>

      {/* 加密对话框 */}
      <Dialog open={encryptDialog} onClose={() => setEncryptDialog(false)}>
        <DialogTitle>加密PDF</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="用户密码（打开密码）"
            type="password"
            fullWidth
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            placeholder="用于打开PDF的密码"
          />
          <TextField
            margin="dense"
            label="所有者密码（权限密码）"
            type="password"
            fullWidth
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            placeholder="用于修改PDF权限的密码"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEncryptDialog(false)}>取消</Button>
          <Button onClick={handleEncryptConfirm} variant="contained" disabled={!userPassword || !ownerPassword}>
            确定
          </Button>
        </DialogActions>
      </Dialog>

      {/* 解密对话框 */}
      <Dialog open={decryptDialog} onClose={() => setDecryptDialog(false)}>
        <DialogTitle>解密PDF</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="密码"
            type="password"
            fullWidth
            value={decryptPassword}
            onChange={(e) => setDecryptPassword(e.target.value)}
            placeholder="请输入PDF密码"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecryptDialog(false)}>取消</Button>
          <Button onClick={handleDecryptConfirm} variant="contained" disabled={!decryptPassword}>
            确定
          </Button>
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
