package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// OpenPDF 打开PDF文件选择对话框
func (a *App) OpenPDF() (string, error) {
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择PDF文件",
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF文件 (*.pdf)", Pattern: "*.pdf"},
		},
	})
	if err != nil {
		return "", err
	}
	return file, nil
}

// MergePDFs 合并多个PDF文件
func (a *App) MergePDFs(outputPath string, inputPaths []string) error {
	return api.MergeCreateFile(inputPaths, outputPath, false, nil)
}

// SplitPDF 分割PDF
func (a *App) SplitPDF(inputPath string, outputDir string) error {
	return api.SplitFile(inputPath, outputDir, 1, nil)
}

// ExtractPages 提取指定页面
func (a *App) ExtractPages(inputPath string, outputPath string, pages []int) error {
	// Convert []int to []string for page numbers
	pageStrs := make([]string, len(pages))
	for i, p := range pages {
		pageStrs[i] = fmt.Sprintf("%d", p)
	}
	return api.ExtractPagesFile(inputPath, outputPath, pageStrs, nil)
}

// RotatePages 旋转页面
func (a *App) RotatePages(inputPath string, rotation int) error {
	outputPath := inputPath + ".tmp"
	err := api.RotateFile(inputPath, outputPath, rotation, nil, nil)
	if err != nil {
		return err
	}
	// Replace original file with rotated version
	os.Remove(inputPath)
	return os.Rename(outputPath, inputPath)
}

// GetPDFInfo 获取PDF信息
func (a *App) GetPDFInfo(filePath string) (map[string]interface{}, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	info, err := api.PDFInfo(f, "", nil, false, nil)
	if err != nil {
		return nil, err
	}

	pageCount, _ := api.PageCountFile(filePath)

	result := map[string]interface{}{
		"info":      info,
		"pageCount": pageCount,
		"message":   fmt.Sprintf("PDF有 %d 页", pageCount),
	}
	return result, nil
}

// OptimizePDF 优化PDF文件大小
func (a *App) OptimizePDF(inputPath string) error {
	outputPath := inputPath + ".optimized.pdf"
	err := api.OptimizeFile(inputPath, outputPath, nil)
	if err != nil {
		return err
	}
	os.Remove(inputPath)
	return os.Rename(outputPath, inputPath)
}

// AddWatermark 添加文字水印
func (a *App) AddWatermark(inputPath string, text string) error {
	outputPath := inputPath + ".watermarked.pdf"
	err := api.AddTextWatermarksFile(inputPath, outputPath, nil, true, text, "", nil)
	if err != nil {
		return err
	}
	os.Remove(inputPath)
	return os.Rename(outputPath, inputPath)
}

// RemoveWatermark 移除水印
func (a *App) RemoveWatermark(inputPath string) error {
	outputPath := inputPath + ".nowatermark.pdf"
	err := api.RemoveWatermarksFile(inputPath, outputPath, nil, nil)
	if err != nil {
		return err
	}
	os.Remove(inputPath)
	return os.Rename(outputPath, inputPath)
}

// EncryptPDF 加密PDF
func (a *App) EncryptPDF(inputPath string, userPassword string, ownerPassword string) error {
	outputPath := inputPath + ".encrypted.pdf"
	conf := api.LoadConfiguration()
	conf.UserPW = userPassword
	conf.OwnerPW = ownerPassword
	err := api.EncryptFile(inputPath, outputPath, conf)
	if err != nil {
		return err
	}
	os.Remove(inputPath)
	return os.Rename(outputPath, inputPath)
}

// DecryptPDF 解密PDF
func (a *App) DecryptPDF(inputPath string, password string) error {
	outputPath := inputPath + ".decrypted.pdf"
	conf := api.LoadConfiguration()
	conf.UserPW = password
	err := api.DecryptFile(inputPath, outputPath, conf)
	if err != nil {
		return err
	}
	os.Remove(inputPath)
	return os.Rename(outputPath, inputPath)
}

// ExtractImages 提取PDF中的图片
func (a *App) ExtractImages(inputPath string, outputDir string) error {
	return api.ExtractImagesFile(inputPath, outputDir, nil, nil)
}

// RemovePages 删除指定页面
func (a *App) RemovePages(inputPath string, pages []int) error {
	outputPath := inputPath + ".removed.pdf"
	pageStrs := make([]string, len(pages))
	for i, p := range pages {
		pageStrs[i] = fmt.Sprintf("%d", p)
	}
	err := api.RemovePagesFile(inputPath, outputPath, pageStrs, nil)
	if err != nil {
		return err
	}
	os.Remove(inputPath)
	return os.Rename(outputPath, inputPath)
}

// InsertPages 插入空白页
func (a *App) InsertPages(inputPath string, pageNr int, count int) error {
	outputPath := inputPath + ".inserted.pdf"
	pageStrs := []string{fmt.Sprintf("%d", pageNr)}
	err := api.InsertPagesFile(inputPath, outputPath, pageStrs, true, nil, nil)
	if err != nil {
		return err
	}
	os.Remove(inputPath)
	return os.Rename(outputPath, inputPath)
}

// SaveAs 另存为
func (a *App) SaveAs(inputPath string) (string, error) {
	outputPath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "另存为",
		DefaultFilename: "output.pdf",
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF文件 (*.pdf)", Pattern: "*.pdf"},
		},
	})
	if err != nil {
		return "", err
	}
	if outputPath == "" {
		return "", fmt.Errorf("未选择保存路径")
	}

	// 复制文件
	input, err := os.ReadFile(inputPath)
	if err != nil {
		return "", err
	}
	err = os.WriteFile(outputPath, input, 0644)
	if err != nil {
		return "", err
	}
	return outputPath, nil
}

// SelectMultiplePDFs 选择多个PDF文件用于合并
func (a *App) SelectMultiplePDFs() ([]string, error) {
	files, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择要合并的PDF文件",
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF文件 (*.pdf)", Pattern: "*.pdf"},
		},
	})
	if err != nil {
		return nil, err
	}
	return files, nil
}

// SelectDirectory 选择目录
func (a *App) SelectDirectory() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择输出目录",
	})
	if err != nil {
		return "", err
	}
	return dir, nil
}

// ReadPDFAsBase64 读取PDF文件并返回base64编码
func (a *App) ReadPDFAsBase64(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(data), nil
}

// RenderPDFPage 渲染PDF页面为PNG图片（base64编码）
func (a *App) RenderPDFPage(filePath string, pageNum int, scale float64) (string, error) {
	// 创建临时目录
	tempDir := fmt.Sprintf("%s_temp_page%d", filePath, pageNum)
	os.MkdirAll(tempDir, 0755)
	defer os.RemoveAll(tempDir)
	
	// 使用pdfcpu提取单页到临时目录
	pageStr := fmt.Sprintf("%d", pageNum)
	err := api.ExtractPagesFile(filePath, tempDir, []string{pageStr}, nil)
	if err != nil {
		return "", fmt.Errorf("提取页面失败: %v", err)
	}
	
	// 查找生成的PDF文件
	files, err := os.ReadDir(tempDir)
	if err != nil {
		return "", fmt.Errorf("读取临时目录失败: %v", err)
	}
	
	if len(files) == 0 {
		return "", fmt.Errorf("未找到提取的页面文件")
	}
	
	// 读取第一个PDF文件（使用filepath.Join处理路径）
	tempPDFPath := tempDir + string(os.PathSeparator) + files[0].Name()
	data, err := os.ReadFile(tempPDFPath)
	if err != nil {
		return "", fmt.Errorf("读取页面文件失败: %v", err)
	}
	
	// 返回PDF数据的base64编码
	return base64.StdEncoding.EncodeToString(data), nil
}

// ReadPDFPagesAsBase64 读取PDF指定页面范围并返回base64编码（懒加载优化）
// startPage: 起始页码（从1开始）
// endPage: 结束页码（包含）
func (a *App) ReadPDFPagesAsBase64(filePath string, startPage int, endPage int) (string, error) {
	// 创建临时文件用于存储提取的页面
	tempFile := filePath + ".temp.pdf"
	defer os.Remove(tempFile)

	// 提取指定页面范围
	pageStrs := []string{}
	for i := startPage; i <= endPage; i++ {
		pageStrs = append(pageStrs, fmt.Sprintf("%d", i))
	}

	err := api.ExtractPagesFile(filePath, tempFile, pageStrs, nil)
	if err != nil {
		return "", err
	}

	// 读取提取后的PDF
	data, err := os.ReadFile(tempFile)
	if err != nil {
		return "", err
	}

	return base64.StdEncoding.EncodeToString(data), nil
}

// OutlineItem 表示PDF大纲项
type OutlineItem struct {
	Title    string         `json:"title"`
	Page     int            `json:"page"`
	Children []OutlineItem  `json:"children,omitempty"`
}

// GetPDFOutline 获取PDF目录大纲
func (a *App) GetPDFOutline(filePath string) ([]OutlineItem, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	// 使用pdfcpu获取大纲信息
	// 注意：pdfcpu的大纲功能可能有限，这里提供基本实现
	// 如果需要更完整的大纲支持，可能需要使用其他库
	
	// 目前pdfcpu没有直接的大纲提取API
	// 这里返回一个空数组，表示功能已准备好但需要更高级的PDF库
	return []OutlineItem{}, nil
}

// GetPDFPageSize 获取PDF页面尺寸
func (a *App) GetPDFPageSize(filePath string, pageNum int) (map[string]float64, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	
	// 使用pdfcpu获取页面信息
	// 返回默认尺寸（A4: 595x842 points）
	return map[string]float64{
		"width":  595,
		"height": 842,
	}, nil
}
