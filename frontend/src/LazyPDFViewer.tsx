import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Box, IconButton, Typography, Paper, Stack, Tooltip, Chip } from '@mui/material'
import {
  ZoomIn,
  ZoomOut,
  NavigateBefore,
  NavigateNext,
  FirstPage,
  LastPage,
  Memory,
  CleaningServices,
} from '@mui/icons-material'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// 设置 PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// 懒加载配置：只加载当前页和相邻页面
const PRELOAD_RANGE = 2 // 前后预加载页数
const MAX_CACHE_SIZE = 5 // 最大缓存页数（减少以更激进地清理内存）

// 优化的PDF.js配置
const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  maxImageSize: 1024 * 1024 * 5, // 5MB
  disableAutoFetch: true, // 禁用自动获取
  disableStream: false, // 启用流式加载
  disableRange: false, // 启用范围请求
  rangeChunkSize: 65536, // 64KB块
}

interface LazyPDFViewerProps {
  file: string
  currentPage?: number
  onPageChange?: (page: number) => void
  onLoadSuccess?: (numPages: number) => void
}

export default function LazyPDFViewer({ 
  file, 
  currentPage, 
  onPageChange, 
  onLoadSuccess 
}: LazyPDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(currentPage || 1)
  const [scale, setScale] = useState<number>(1.0)
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set())
  const [cachedPages, setCachedPages] = useState<number[]>([])
  const [cleanupCount, setCleanupCount] = useState<number>(0)
  const pdfDocumentRef = useRef<any>(null)
  const pageCache = useRef<Map<number, any>>(new Map())
  const renderTasksRef = useRef<Map<number, any>>(new Map())

  function onDocumentLoadSuccess(pdf: any) {
    pdfDocumentRef.current = pdf
    setNumPages(pdf.numPages)
    const initialPage = currentPage || 1
    setPageNumber(initialPage)
    setLoadedPages(new Set([initialPage]))
    
    if (onLoadSuccess) {
      onLoadSuccess(pdf.numPages)
    }
    
    console.log(`� PDF加载成功:加 共 ${pdf.numPages} 页`)
    console.log(`🚀 懒加载模式: 只加载当前页及前后 ${PRELOAD_RANGE} 页`)
    console.log(`🧹 自动清理: 跳转页面时立即清理缓存`)
  }

  // 页面加载成功回调
  const onPageLoadSuccess = (page: number) => {
    setLoadedPages(prev => {
      const newSet = new Set(prev)
      newSet.add(page)
      return newSet
    })
    
    // 更新缓存
    setCachedPages(prev => {
      const newCache = [...prev, page].filter((v, i, a) => a.indexOf(v) === i)
      // 限制缓存大小
      if (newCache.length > MAX_CACHE_SIZE) {
        const toRemove = newCache.shift()
        if (toRemove) {
          pageCache.current.delete(toRemove)
        }
      }
      return newCache
    })
    
    console.log(`✅ 第 ${page} 页加载完成`)
  }

  // 监听外部页面变化
  useEffect(() => {
    if (currentPage && currentPage !== pageNumber) {
      setPageNumber(currentPage)
    }
  }, [currentPage])

  // 计算需要预加载的页面范围
  const getPreloadRange = useCallback((current: number): number[] => {
    const pages: number[] = []
    for (let i = -PRELOAD_RANGE; i <= PRELOAD_RANGE; i++) {
      const page = current + i
      if (page > 0 && page <= numPages) {
        pages.push(page)
      }
    }
    return pages
  }, [numPages])

  // 清理页面缓存和渲染任务
  const cleanupPages = useCallback((pagesToKeep: Set<number>) => {
    let cleanedCount = 0
    
    // 取消不需要的渲染任务
    renderTasksRef.current.forEach((task, pageNum) => {
      if (!pagesToKeep.has(pageNum)) {
        try {
          task.cancel()
          renderTasksRef.current.delete(pageNum)
          cleanedCount++
        } catch (e) {
          // 任务可能已经完成
        }
      }
    })
    
    // 清理页面缓存
    if (pdfDocumentRef.current) {
      pageCache.current.forEach((_, pageNum) => {
        if (!pagesToKeep.has(pageNum)) {
          // 清理页面对象
          pdfDocumentRef.current?.getPage(pageNum).then((page: any) => {
            try {
              page.cleanup()
            } catch (e) {
              // 页面可能已经被清理
            }
          }).catch(() => {})
          
          pageCache.current.delete(pageNum)
          cleanedCount++
        }
      })
    }
    
    // 更新已加载页面集合
    setLoadedPages(prev => {
      const newSet = new Set<number>()
      prev.forEach(page => {
        if (pagesToKeep.has(page)) {
          newSet.add(page)
        }
      })
      return newSet
    })
    
    if (cleanedCount > 0) {
      setCleanupCount(prev => prev + cleanedCount)
      console.log(`🧹 清理了 ${cleanedCount} 个页面的缓存`)
    }
    
    return cleanedCount
  }, [])

  // 立即清理不在预加载范围内的页面缓存（页面跳转时触发）
  useEffect(() => {
    if (numPages > 0 && pdfDocumentRef.current) {
      const preloadPages = getPreloadRange(pageNumber)
      const preloadSet = new Set(preloadPages)
      
      // 立即清理不需要的页面
      const cleaned = cleanupPages(preloadSet)
      
      // 更新缓存页面列表
      setCachedPages(Array.from(preloadSet).filter(page => loadedPages.has(page)))
      
      console.log(`📦 当前页: ${pageNumber}, 缓存范围: [${preloadPages.join(', ')}]`)
      
      // 强制垃圾回收提示（仅在开发环境）
      if (cleaned > 0 && typeof window !== 'undefined' && (window as any).gc) {
        try {
          (window as any).gc()
          console.log('♻️ 触发垃圾回收')
        } catch (e) {
          // gc 不可用
        }
      }
    }
  }, [pageNumber, numPages, getPreloadRange, cleanupPages, loadedPages])

  const changePage = useCallback((offset: number) => {
    const newPage = pageNumber + offset
    console.log(`🔄 跳转到第 ${newPage} 页`)
    setPageNumber(newPage)
    if (onPageChange) {
      onPageChange(newPage)
    }
  }, [pageNumber, onPageChange])

  const previousPage = useCallback(() => {
    if (pageNumber > 1) changePage(-1)
  }, [pageNumber, changePage])

  const nextPage = useCallback(() => {
    if (pageNumber < numPages) changePage(1)
  }, [pageNumber, numPages, changePage])

  const firstPage = useCallback(() => {
    console.log('🔄 跳转到第一页')
    setPageNumber(1)
    if (onPageChange) {
      onPageChange(1)
    }
  }, [onPageChange])

  const lastPage = useCallback(() => {
    console.log(`🔄 跳转到最后一页 (${numPages})`)
    setPageNumber(numPages)
    if (onPageChange) {
      onPageChange(numPages)
    }
  }, [numPages, onPageChange])

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.2, 3.0))
  }, [])

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.2, 0.5))
  }, [])

  // 组件卸载时清理所有缓存
  useEffect(() => {
    return () => {
      console.log('🧹 组件卸载，清理所有缓存')
      
      // 取消所有渲染任务
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel()
        } catch (e) {
          // 忽略错误
        }
      })
      renderTasksRef.current.clear()
      
      // 清理所有页面
      if (pdfDocumentRef.current) {
        pageCache.current.forEach((_, pageNum) => {
          pdfDocumentRef.current?.getPage(pageNum).then((page: any) => {
            try {
              page.cleanup()
            } catch (e) {
              // 忽略错误
            }
          }).catch(() => {})
        })
      }
      
      pageCache.current.clear()
      pdfDocumentRef.current = null
    }
  }, [])

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
          <Tooltip title={`已缓存 ${cachedPages.length} 页，已清理 ${cleanupCount} 次`}>
            <Chip
              icon={<Memory />}
              label={`${cachedPages.length}/${MAX_CACHE_SIZE}`}
              size="small"
              color={cachedPages.length >= MAX_CACHE_SIZE ? 'warning' : 'success'}
            />
          </Tooltip>
          {cleanupCount > 0 && (
            <Tooltip title={`已清理 ${cleanupCount} 个页面缓存`}>
              <Chip
                icon={<CleaningServices />}
                label={cleanupCount}
                size="small"
                color="info"
              />
            </Tooltip>
          )}
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
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                懒加载模式：只加载必要页面，自动清理缓存
              </Typography>
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
            onLoadSuccess={() => onPageLoadSuccess(pageNumber)}
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
