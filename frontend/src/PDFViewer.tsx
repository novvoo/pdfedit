import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Box, IconButton, Typography, Paper, Stack, Tooltip } from '@mui/material'
import {
  ZoomIn,
  ZoomOut,
  NavigateBefore,
  NavigateNext,
  FirstPage,
  LastPage,
} from '@mui/icons-material'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// 设置 PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// 配置 PDF.js 以优化内存使用 - 懒加载策略
const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  // 限制缓存大小，减少内存占用
  maxImageSize: 1024 * 1024 * 5, // 5MB
  disableAutoFetch: true, // 禁用自动获取所有页面
  disableStream: false, // 启用流式加载
  // 懒加载配置：只加载当前页面和附近几页
  disableRange: false, // 启用范围请求
  rangeChunkSize: 65536, // 64KB 块大小
  // 限制预加载范围
  pdfBug: false,
}

interface PDFViewerProps {
  file: string
  currentPage?: number
  onPageChange?: (page: number) => void
  onLoadSuccess?: (numPages: number) => void
}

export default function PDFViewer({ file, currentPage, onPageChange, onLoadSuccess }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(currentPage || 1)
  const [scale, setScale] = useState<number>(1.0)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(currentPage || 1)
    if (onLoadSuccess) {
      onLoadSuccess(numPages)
    }
  }

  // 监听外部页面变化
  useEffect(() => {
    if (currentPage && currentPage !== pageNumber) {
      setPageNumber(currentPage)
    }
  }, [currentPage])

  // 预加载相邻页面（前后各2页）
  useEffect(() => {
    if (numPages > 0) {
      const pagesToPreload = new Set<number>()
      // 当前页
      pagesToPreload.add(pageNumber)
      // 前后各2页
      for (let i = -2; i <= 2; i++) {
        const page = pageNumber + i
        if (page > 0 && page <= numPages) {
          pagesToPreload.add(page)
        }
      }
      // 这里只是标记需要预加载的页面，实际加载由react-pdf处理
      console.log(`预加载页面范围: ${Math.max(1, pageNumber - 2)} - ${Math.min(numPages, pageNumber + 2)}`)
    }
  }, [pageNumber, numPages])

  const changePage = (offset: number) => {
    const newPage = pageNumber + offset
    setPageNumber(newPage)
    if (onPageChange) {
      onPageChange(newPage)
    }
  }

  const previousPage = () => {
    if (pageNumber > 1) changePage(-1)
  }

  const nextPage = () => {
    if (pageNumber < numPages) changePage(1)
  }

  const firstPage = () => {
    setPageNumber(1)
    if (onPageChange) {
      onPageChange(1)
    }
  }

  const lastPage = () => {
    setPageNumber(numPages)
    if (onPageChange) {
      onPageChange(numPages)
    }
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 工具栏 */}
      <Paper
        elevation={1}
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 0,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="第一页">
            <span>
              <IconButton onClick={firstPage} disabled={pageNumber <= 1} size="small">
                <FirstPage />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="上一页">
            <span>
              <IconButton onClick={previousPage} disabled={pageNumber <= 1} size="small">
                <NavigateBefore />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="body2" sx={{ minWidth: 100, textAlign: 'center' }}>
            {pageNumber} / {numPages}
          </Typography>
          <Tooltip title="下一页">
            <span>
              <IconButton onClick={nextPage} disabled={pageNumber >= numPages} size="small">
                <NavigateNext />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="最后一页">
            <span>
              <IconButton onClick={lastPage} disabled={pageNumber >= numPages} size="small">
                <LastPage />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="缩小">
            <IconButton onClick={zoomOut} disabled={scale <= 0.5} size="small">
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </Typography>
          <Tooltip title="放大">
            <IconButton onClick={zoomIn} disabled={scale >= 3.0} size="small">
              <ZoomIn />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* PDF 内容 */}
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
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          options={pdfOptions}
          loading={
            <Box sx={{ textAlign: 'center', color: 'white', p: 4 }}>
              <Typography>加载PDF中...</Typography>
            </Box>
          }
          error={
            <Box sx={{ textAlign: 'center', color: 'white', p: 4 }}>
              <Typography>加载PDF失败</Typography>
            </Box>
          }
        >
          <Page
            key={`page_${pageNumber}`}
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            loading={
              <Box sx={{ textAlign: 'center', color: 'white', p: 4 }}>
                <Typography>加载第 {pageNumber} 页中...</Typography>
              </Box>
            }
          />
        </Document>
      </Box>
    </Box>
  )
}
