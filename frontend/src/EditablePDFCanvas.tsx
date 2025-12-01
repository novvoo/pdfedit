import { useState, useEffect, useRef } from 'react'
import { Box, Paper, Stack, IconButton, Tooltip, Chip, TextField, Button, Divider } from '@mui/material'
import {
  ZoomIn,
  ZoomOut,
  NavigateBefore,
  NavigateNext,
  FirstPage,
  LastPage,
  TextFields,
  Image as ImageIcon,
  Undo,
  Redo,
  Save,
  Delete,
} from '@mui/icons-material'
import { RenderPDFPage } from '../wailsjs/go/main/App'

interface EditableElement {
  id: string
  type: 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  content: string
  fontSize?: number
  color?: string
}

interface EditablePDFCanvasProps {
  file: string
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
  onSave: () => void
}

export default function EditablePDFCanvas({
  file,
  totalPages,
  currentPage,
  onPageChange,
  onSave,
}: EditablePDFCanvasProps) {
  const [scale, setScale] = useState<number>(1.0)
  const [pageImage, setPageImage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [elements, setElements] = useState<EditableElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // 加载PDF页面作为背景
  useEffect(() => {
    const loadPage = async () => {
      setLoading(true)
      try {
        const base64Data = await RenderPDFPage(file, currentPage, scale)
        const dataUrl = `data:application/pdf;base64,${base64Data}`
        setPageImage(dataUrl)
      } catch (error) {
        console.error('加载页面失败:', error)
      } finally {
        setLoading(false)
      }
    }

    if (file && totalPages > 0) {
      loadPage()
    }
  }, [file, currentPage, scale, totalPages])

  const addTextElement = () => {
    const newElement: EditableElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 40,
      content: '双击编辑文本',
      fontSize: 16,
      color: '#000000',
    }
    setElements([...elements, newElement])
    setSelectedElement(newElement.id)
  }

  const deleteElement = () => {
    if (selectedElement) {
      setElements(elements.filter(el => el.id !== selectedElement))
      setSelectedElement(null)
    }
  }

  const updateElement = (id: string, updates: Partial<EditableElement>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    setSelectedElement(elementId)
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedElement && dragStart) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      
      const element = elements.find(el => el.id === selectedElement)
      if (element) {
        updateElement(selectedElement, {
          x: element.x + dx / scale,
          y: element.y + dy / scale,
        })
      }
      
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

          {/* 编辑工具 */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="添加文本">
              <IconButton onClick={addTextElement} size="small" color="primary">
                <TextFields />
              </IconButton>
            </Tooltip>
            <Tooltip title="添加图片">
              <IconButton size="small" color="primary">
                <ImageIcon />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="删除选中">
              <span>
                <IconButton 
                  onClick={deleteElement} 
                  disabled={!selectedElement}
                  size="small"
                  color="error"
                >
                  <Delete />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="撤销">
              <IconButton size="small">
                <Undo />
              </IconButton>
            </Tooltip>
            <Tooltip title="重做">
              <IconButton size="small">
                <Redo />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="保存">
              <IconButton onClick={onSave} size="small" color="success">
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

      {/* 编辑画布 */}
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
            加载中...
          </Box>
        ) : (
          <Box
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            sx={{
              position: 'relative',
              width: `${595 * scale}px`,
              height: `${842 * scale}px`,
              bgcolor: 'white',
              boxShadow: 3,
              cursor: isDragging ? 'grabbing' : 'default',
            }}
          >
            {/* PDF背景 */}
            {pageImage && (
              <Box
                component="iframe"
                src={pageImage}
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
            )}

            {/* 可编辑元素层 */}
            {elements.map(element => (
              <Box
                key={element.id}
                onMouseDown={(e) => handleMouseDown(e, element.id)}
                sx={{
                  position: 'absolute',
                  left: `${element.x * scale}px`,
                  top: `${element.y * scale}px`,
                  width: `${element.width * scale}px`,
                  height: `${element.height * scale}px`,
                  border: selectedElement === element.id ? '2px solid #1976d2' : '1px dashed transparent',
                  cursor: 'move',
                  '&:hover': {
                    border: '1px dashed #1976d2',
                  },
                }}
              >
                {element.type === 'text' && (
                  <TextField
                    value={element.content}
                    onChange={(e) => updateElement(element.id, { content: e.target.value })}
                    multiline
                    fullWidth
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      style: {
                        fontSize: `${(element.fontSize || 16) * scale}px`,
                        color: element.color || '#000000',
                      },
                    }}
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '100%',
                      },
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* 属性面板 */}
      {selectedElement && (
        <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {elements.find(el => el.id === selectedElement)?.type === 'text' && (
              <>
                <TextField
                  label="字体大小"
                  type="number"
                  size="small"
                  value={elements.find(el => el.id === selectedElement)?.fontSize || 16}
                  onChange={(e) => updateElement(selectedElement, { fontSize: parseInt(e.target.value) })}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="颜色"
                  type="color"
                  size="small"
                  value={elements.find(el => el.id === selectedElement)?.color || '#000000'}
                  onChange={(e) => updateElement(selectedElement, { color: e.target.value })}
                  sx={{ width: 100 }}
                />
              </>
            )}
            <Button variant="outlined" color="error" onClick={deleteElement}>
              删除元素
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  )
}
