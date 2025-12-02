import { useState, useEffect, useCallback, useRef } from 'react'
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
import { RenderPDFPage } from '../wailsjs/go/main/App'

// 懒加载配置：只加载当前页和相邻页面
const PRELOAD_RANGE = 2 // 前后预加载页数
const MAX_CACHE_SIZE = 5 // 最大缓存页数

interface GoPDFViewerProps {
  file: string
  totalPages: number
  currentPage?: number
  onPageChange?: (page: number) => void
}

export default function GoPDFViewer({ 
  file, 
  totalPages,
  currentPage, 
  onPageChange,
}: GoPDFViewerProps) {
  const [pageNumber, setPageNumber] = useState<number>(currentPage || 1)
  const [scale, setScale] = useState<number>(1.0)
  const [pageImage, setPageImage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [cachedPages, setCachedPages] = useState<Map<string, string>>(new Map())
  const [cleanupCount, setCleanupCount] = useState<number>(0)
  const loadingRef = useRef<Set<string>>(new Set())

  // 计算需要预加载的页面范围
  const getPreloadRange = useCallback((current: number): number[] => {
    const pages: number[] = []
    for (let i = -PRELOAD_RANGE; i <= PRELOAD_RANGE; i++) {
      const page = current + i
      if (page > 0 && page <= totalPages) {
        pages.push(page)
      }
    }
    return pages
  }, [totalPages])

  // 清理不在预加载范围内的页面缓存
  const cleanupCache = useCallback((pagesToKeep: Set<number>, currentScale: number) => {
    setCachedPages(prev => {
      // 如果缓存未超过限制，不清理
      if (prev.size <= MAX_CACHE_SIZE) {
        return prev
      }

      const newCache = new Map<string, string>()
      let cleanedCount = 0
      
      prev.forEach((value, key) => {
        const [pageStr, scaleStr] = key.split('-')
        const page = parseInt(pageStr)
        const keyScale = parseFloat(scaleStr)
        
        // 保留当前缩放级别且在预加载范围内的页面
        if (pagesToKeep.has(page) && Math.abs(keyScale - currentScale) < 0.01) {
          newCache.set(key, value)
        } else {
          cleanedCount++
        }
      })
      
      if (cleanedCount > 0) {
        setCleanupCount(prev => prev + cleanedCount)
        console.log(`🧹 清理了 ${cleanedCount} 个页面的缓存 (缓存大小: ${prev.size} -> ${newCache.size})`)
      }
      
      return newCache
    })
  }, [])

  // 监听页面和缩放变化
  useEffect(() => {
    if (totalPages <= 0) return

    let isMounted = true
    const currentCacheKey = `${pageNumber}-${scale.toFixed(1)}`

    const loadPage = async (page: number, currentScale: number) => {
      const cacheKey = `${page}-${currentScale.toFixed(1)}`
      
      // 防止重复加载
      if (loadingRef.current.has(cacheKey)) {
        console.log(`⏭️ 第 ${page} 页正在加载中，跳过`)
        return
      }
      
      loadingRef.current.add(cacheKey)
      
      if (page === pageNumber && isMounted) {
        setLoading(true)
        console.log(`🔄 开始加载第 ${page} 页...`)
      }
      
      try {
        // 调用Go后端渲染页面
        console.log(`📡 调用后端渲染第 ${page} 页，缩放: ${currentScale}`)
        // 后端返回的已经是完整的 data URL (data:image/png;base64,...)
        const dataUrl = await RenderPDFPage(file, page, currentScale * 150)
        
        if (!isMounted) return
        
        // 更新缓存
        setCachedPages(prev => {
          const newCache = new Map(prev)
          newCache.set(cacheKey, dataUrl)
          return newCache
        })
        
        // 如果是当前页，显示它
        if (page === pageNumber && isMounted) {
          setPageImage(dataUrl)
          setLoading(false)
          console.log(`✅ 第 ${page} 页加载完成并显示`)
        } else {
          console.log(`✅ 第 ${page} 页预加载完成`)
        }
      } catch (error) {
        console.error(`❌ 加载第 ${page} 页失败:`, error)
        if (page === pageNumber && isMounted) {
          setLoading(false)
        }
      } finally {
        loadingRef.current.delete(cacheKey)
      }
    }

    const preloadPages = getPreloadRange(pageNumber)
    const preloadSet = new Set(preloadPages)
    
    console.log(`📦 当前页: ${pageNumber}, 缓存范围: [${preloadPages.join(', ')}], 当前缓存: ${cachedPages.size}`)
    
    // 只在缓存超过限制时清理
    if (cachedPages.size > MAX_CACHE_SIZE) {
      cleanupCache(preloadSet, scale)
    }
    
    // 检查当前页是否已在缓存中
    const cachedImage = cachedPages.get(currentCacheKey)
    if (cachedImage) {
      console.log(`💾 从缓存加载第 ${pageNumber} 页`)
      setPageImage(cachedImage)
      setLoading(false)
    } else {
      // 不在缓存中，需要加载
      console.log(`🆕 第 ${pageNumber} 页不在缓存中，开始加载`)
      loadPage(pageNumber, scale)
    }
    
    // 预加载相邻页面
    preloadPages.forEach(page => {
      if (page !== pageNumber) {
        const cacheKey = `${page}-${scale.toFixed(1)}`
        if (!cachedPages.has(cacheKey) && !loadingRef.current.has(cacheKey)) {
          loadPage(page, scale)
        }
      }
    })

    return () => {
      isMounted = false
    }
  }, [pageNumber, scale, totalPages, file, cachedPages, getPreloadRange, cleanupCache])

  // 监听外部页面变化
  useEffect(() => {
    if (currentPage && currentPage !== pageNumber) {
      setPageNumber(currentPage)
    }
  }, [currentPage])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      console.log('🧹 组件卸载，清理所有缓存')
      setCachedPages(new Map())
      loadingRef.current.clear()
    }
  }, [])

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
    if (pageNumber < totalPages) changePage(1)
  }, [pageNumber, totalPages, changePage])

  const firstPage = useCallback(() => {
    console.log('🔄 跳转到第一页')
    setPageNumber(1)
    if (onPageChange) {
      onPageChange(1)
    }
  }, [onPageChange])

  const lastPage = useCallback(() => {
    console.log(`🔄 跳转到最后一页 (${totalPages})`)
    setPageNumber(totalPages)
    if (onPageChange) {
      onPageChange(totalPages)
    }
  }, [totalPages, onPageChange])

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.2, 3.0))
  }, [])

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.2, 0.5))
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
            {pageNumber} / {totalPages}
          </Typography>
          <Tooltip title="下一页">
            <span>
              <IconButton onClick={nextPage} disabled={pageNumber >= totalPages} size="small">
                <NavigateNext />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="最后一页">
            <span>
              <IconButton onClick={lastPage} disabled={pageNumber >= totalPages} size="small">
                <LastPage />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={`已缓存 ${cachedPages.size} 页，已清理 ${cleanupCount} 次`}>
            <Chip
              icon={<Memory />}
              label={`${cachedPages.size}/${MAX_CACHE_SIZE}`}
              size="small"
              color={cachedPages.size >= MAX_CACHE_SIZE ? 'warning' : 'success'}
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
          <Chip
            label="Go渲染"
            size="small"
            color="primary"
          />
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
        {loading && !pageImage ? (
          <Box sx={{ textAlign: 'center', color: 'white', p: 4 }}>
            <Typography>加载第 {pageNumber} 页中...</Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Go后端渲染模式：懒加载 + 自动清理缓存
            </Typography>
          </Box>
        ) : pageImage ? (
          <Box
            component="img"
            src={pageImage}
            alt={`Page ${pageNumber}`}
            sx={{
              bgcolor: 'white',
              boxShadow: 3,
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        ) : (
          <Box sx={{ textAlign: 'center', color: 'white', p: 4 }}>
            <Typography>准备加载...</Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Go后端渲染模式：只加载当前页及前后 {PRELOAD_RANGE} 页
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
