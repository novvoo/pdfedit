import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  TextField,
  Button,
  Typography,
  Divider,
} from '@mui/material'
import {
  ZoomIn,
  ZoomOut,
  NavigateBefore,
  NavigateNext,
  FirstPage,
  LastPage,
  TextFields,
  Layers as LayersIcon,
  Delete,
  Save,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { ConvertPDFToPSD, ExportPSDToPDF } from '../wailsjs/go/main/App'

interface Layer {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  content: string
  visible: boolean
  fontSize?: number
  fontColor?: string
}

interface PSDDocument {
  filePath: string
  pageNumber: number
  width: number
  height: number
  layers: Layer[]
}

interface LayerBasedEditorProps {
  file: string
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
}

export default function LayerBasedEditor({
  file,
  totalPages,
  currentPage,
  onPageChange,
}: LayerBasedEditorProps) {
  const [scale, setScale] = useState<number>(1.0)
  const [psdDoc, setPsdDoc] = useState<PSDDocument | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null)
  const [showLayers, setShowLayers] = useState<boolean>(true)

  // 加载PDF页面为PSD格式
  useEffect(() => {
    const loadPSD = async () => {
      setLoading(true)
      try {
        console.log('🔄 转换PDF为PSD格式...')
        const doc = await ConvertPDFToPSD(file, currentPage)
        setPsdDoc(doc)
        console.log('✅ PSD文档加载完成，图层数:', doc.layers.length)
      } catch (error) {
        console.error('❌ 加载PSD失败:', error)
      } finally {
        setLoading(false)
      }
    }

    if (file && totalPages > 0) {
      loadPSD()
    }
  }, [file, currentPage, totalPages])

  const addTextLayer = () => {
    if (!psdDoc) return

    const newLayer: Layer = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 40,
      content: '双击编辑文本',
      visible: true,
      fontSize: 16,
      fontColor: '#000000',
    }

    const updatedDoc = { ...psdDoc, layers: [...psdDoc.layers, newLayer] }
    setPsdDoc(updatedDoc)
    setSelectedLayer(newLayer.id)
    console.log('➕ 添加文本图层:', newLayer.id)
  }

  const deleteLayer = () => {
    if (!psdDoc || !selectedLayer) return

    const updatedLayers = psdDoc.layers.filter(l => l.id !== selectedLayer)
    setPsdDoc({ ...psdDoc, layers: updatedLayers })
    setSelectedLayer(null)
    console.log('🗑️ 删除图层:', selectedLayer)
  }

  const toggleLayerVisibility = (layerId: string) => {
    if (!psdDoc) return

    const updatedLayers = psdDoc.layers.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    )
    setPsdDoc({ ...psdDoc, layers: updatedLayers })
  }

  const updateLayerContent = (layerId: string, content: string) => {
    if (!psdDoc) return

    const updatedLayers = psdDoc.layers.map(l =>
      l.id === layerId ? { ...l, content } : l
    )
    setPsdDoc({ ...psdDoc, layers: updatedLayers })
  }

  const exportToPDF = async () => {
    if (!psdDoc) return

    setLoading(true)
    try {
      console.log('💾 导出PSD为PDF...')
      const outputPath = file.replace('.pdf', '_edited.pdf')
      // 将PSDDocument转换为plain object
      const psdData = JSON.parse(JSON.stringify(psdDoc))
      await ExportPSDToPDF(psdData, outputPath)
      console.log('✅ PDF导出成功:', outputPath)
      alert(`PDF已导出到: ${outputPath}`)
    } catch (error) {
      console.error('❌ 导出失败:', error)
      alert(`导出失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const previousPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1)
  }

  const nextPage = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1)
  }

  const firstPage = () => onPageChange(1)
  const lastPage = () => onPageChange(totalPages)
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* 图层面板 */}
      {showLayers && (
        <Paper
          elevation={1}
          sx={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <LayersIcon />
              <Typography variant="h6">图层</Typography>
            </Stack>
          </Box>

          <List sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            {psdDoc?.layers.map((layer, index) => (
              <ListItemButton
                key={layer.id}
                selected={selectedLayer === layer.id}
                onClick={() => setSelectedLayer(layer.id)}
                sx={{
                  mb: 0.5,
                  borderRadius: 1,
                }}
              >
                <ListItemIcon>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLayerVisibility(layer.id)
                    }}
                  >
                    {layer.visible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                  </IconButton>
                </ListItemIcon>
                <ListItemText
                  primary={
                    layer.type === 'background'
                      ? `背景 (第${psdDoc.pageNumber}页)`
                      : layer.type === 'text'
                      ? `文本 ${index}`
                      : `图层 ${index}`
                  }
                  secondary={layer.type === 'text' ? layer.content.substring(0, 20) : layer.type}
                />
              </ListItemButton>
            ))}
          </List>

          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
            <Stack spacing={1}>
              <Button
                variant="outlined"
                startIcon={<TextFields />}
                onClick={addTextLayer}
                fullWidth
              >
                添加文本
              </Button>
              <Button
                variant="outlined"
                startIcon={<Delete />}
                onClick={deleteLayer}
                disabled={!selectedLayer || psdDoc?.layers.find(l => l.id === selectedLayer)?.type === 'background'}
                color="error"
                fullWidth
              >
                删除图层
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}

      {/* 主编辑区域 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 工具栏 */}
        <Paper elevation={1} sx={{ p: 1, borderRadius: 0 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            {/* 页面导航 */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="第一页">
                <span>
                  <IconButton onClick={firstPage} disabled={currentPage <= 1} size="small">
                    <FirstPage />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="上一页">
                <span>
                  <IconButton onClick={previousPage} disabled={currentPage <= 1} size="small">
                    <NavigateBefore />
                  </IconButton>
                </span>
              </Tooltip>
              <Chip label={`${currentPage} / ${totalPages}`} size="small" />
              <Tooltip title="下一页">
                <span>
                  <IconButton onClick={nextPage} disabled={currentPage >= totalPages} size="small">
                    <NavigateNext />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="最后一页">
                <span>
                  <IconButton onClick={lastPage} disabled={currentPage >= totalPages} size="small">
                    <LastPage />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>

            {/* 操作按钮 */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={`${psdDoc?.layers.length || 0} 图层`} size="small" color="primary" />
              <Tooltip title="切换图层面板">
                <IconButton onClick={() => setShowLayers(!showLayers)} size="small">
                  <LayersIcon />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
              <Tooltip title="导出为PDF">
                <IconButton onClick={exportToPDF} size="small" color="success" disabled={loading}>
                  <Save />
                </IconButton>
              </Tooltip>
            </Stack>

            {/* 缩放控制 */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="缩小">
                <IconButton onClick={zoomOut} disabled={scale <= 0.5} size="small">
                  <ZoomOut />
                </IconButton>
              </Tooltip>
              <Chip label={`${Math.round(scale * 100)}%`} size="small" />
              <Tooltip title="放大">
                <IconButton onClick={zoomIn} disabled={scale >= 3.0} size="small">
                  <ZoomIn />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>

        {/* 画布区域 */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            bgcolor: '#525659',
            p: 2,
          }}
        >
          {loading ? (
            <Box sx={{ textAlign: 'center', color: 'white', p: 4 }}>
              <Typography>处理中...</Typography>
            </Box>
          ) : psdDoc ? (
            <Box
              sx={{
                position: 'relative',
                width: `${psdDoc.width * scale}px`,
                height: `${psdDoc.height * scale}px`,
                bgcolor: 'white',
                boxShadow: 3,
              }}
            >
              {/* 渲染所有图层 */}
              {psdDoc.layers.map((layer) => {
                if (!layer.visible) return null

                if (layer.type === 'background') {
                  return (
                    <Box
                      key={layer.id}
                      component="iframe"
                      src={`data:application/pdf;base64,${layer.content}`}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        pointerEvents: 'none',
                      }}
                    />
                  )
                }

                if (layer.type === 'text') {
                  return (
                    <Box
                      key={layer.id}
                      onClick={() => setSelectedLayer(layer.id)}
                      sx={{
                        position: 'absolute',
                        left: `${layer.x * scale}px`,
                        top: `${layer.y * scale}px`,
                        width: `${layer.width * scale}px`,
                        minHeight: `${layer.height * scale}px`,
                        border: selectedLayer === layer.id ? '2px solid #1976d2' : '1px dashed transparent',
                        cursor: 'pointer',
                        '&:hover': {
                          border: '1px dashed #1976d2',
                        },
                      }}
                    >
                      <TextField
                        value={layer.content}
                        onChange={(e) => updateLayerContent(layer.id, e.target.value)}
                        multiline
                        fullWidth
                        variant="standard"
                        InputProps={{
                          disableUnderline: true,
                          style: {
                            fontSize: `${(layer.fontSize || 16) * scale}px`,
                            color: layer.fontColor || '#000000',
                          },
                        }}
                      />
                    </Box>
                  )
                }

                return null
              })}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', color: 'white', p: 4 }}>
              <Typography>准备加载...</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
