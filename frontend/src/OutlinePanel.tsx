import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
  Box,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material'
import {
  ExpandLess,
  ExpandMore,
  Article,
  Search,
  Clear,
} from '@mui/icons-material'

interface OutlineItem {
  title: string
  page: number
  children?: OutlineItem[]
}

interface OutlinePanelProps {
  outline: OutlineItem[]
  currentPage: number
  totalPages: number
  onPageSelect: (page: number) => void
}

function OutlineItemComponent({
  item,
  level = 0,
  currentPage,
  onPageSelect,
}: {
  item: OutlineItem
  level?: number
  currentPage: number
  onPageSelect: (page: number) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = item.children && item.children.length > 0

  return (
    <>
      <ListItem
        disablePadding
        sx={{
          pl: level * 2,
          bgcolor: currentPage === item.page ? 'action.selected' : 'transparent',
        }}
      >
        <ListItemButton
          onClick={() => onPageSelect(item.page)}
          sx={{ py: 0.5 }}
        >
          <Article sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
          <ListItemText
            primary={item.title}
            secondary={`第 ${item.page} 页`}
            primaryTypographyProps={{
              variant: 'body2',
              noWrap: true,
            }}
            secondaryTypographyProps={{
              variant: 'caption',
            }}
          />
          {hasChildren && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(!open)
              }}
            >
              {open ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children!.map((child, index) => (
              <OutlineItemComponent
                key={index}
                item={child}
                level={level + 1}
                currentPage={currentPage}
                onPageSelect={onPageSelect}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  )
}

export default function OutlinePanel({
  outline,
  currentPage,
  totalPages,
  onPageSelect,
}: OutlinePanelProps) {
  const [searchText, setSearchText] = useState('')
  const [jumpPage, setJumpPage] = useState('')

  const handleJumpToPage = () => {
    const page = parseInt(jumpPage)
    if (page >= 1 && page <= totalPages) {
      onPageSelect(page)
      setJumpPage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToPage()
    }
  }

  const filteredOutline = outline.filter((item) =>
    item.title.toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          目录大纲
        </Typography>

        {/* 页面跳转 */}
        <Box sx={{ mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={`跳转到页面 (1-${totalPages})`}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            onKeyPress={handleKeyPress}
            type="number"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Article fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: jumpPage && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setJumpPage('')}>
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {outline.length > 0 ? (
          <>
            {/* 搜索框 */}
            <TextField
              size="small"
              fullWidth
              placeholder="搜索目录..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchText && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchText('')}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* 目录列表 */}
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredOutline.length > 0 ? (
                filteredOutline.map((item, index) => (
                  <OutlineItemComponent
                    key={index}
                    item={item}
                    currentPage={currentPage}
                    onPageSelect={onPageSelect}
                  />
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    未找到匹配的目录项
                  </Typography>
                </Box>
              )}
            </List>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Article sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              此PDF没有目录大纲
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              您可以使用上方的页面跳转功能
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
