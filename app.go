package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/novvoo/go-poppler/pkg/pdf"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx         context.Context
	currentDoc  *pdf.Document
	currentPath string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ==================== 文件操作 ====================

// OpenPDF opens a file dialog and returns the selected PDF path
func (a *App) OpenPDF() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择 PDF 文件",
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF Files", Pattern: "*.pdf"},
		},
	})
	if err != nil {
		return "", err
	}
	if path == "" {
		return "", nil
	}

	// 打开文档
	doc, err := pdf.Open(path)
	if err != nil {
		return "", fmt.Errorf("无法打开 PDF: %w", err)
	}

	// 关闭之前的文档
	if a.currentDoc != nil {
		a.currentDoc.Close()
	}

	a.currentDoc = doc
	a.currentPath = path
	return path, nil
}

// ClosePDF closes the current document
func (a *App) ClosePDF() error {
	if a.currentDoc != nil {
		a.currentDoc.Close()
		a.currentDoc = nil
		a.currentPath = ""
	}
	return nil
}

// ==================== PDF 信息 ====================

// PDFInfo contains PDF document information
type PDFInfo struct {
	Path         string            `json:"path"`
	NumPages     int               `json:"numPages"`
	Title        string            `json:"title"`
	Author       string            `json:"author"`
	Subject      string            `json:"subject"`
	Keywords     string            `json:"keywords"`
	Creator      string            `json:"creator"`
	Producer     string            `json:"producer"`
	CreationDate string            `json:"creationDate"`
	ModDate      string            `json:"modDate"`
	Version      string            `json:"version"`
	Encrypted    bool              `json:"encrypted"`
	Tagged       bool              `json:"tagged"`
	HasForms     bool              `json:"hasForms"`
	Metadata     map[string]string `json:"metadata"`
}

// GetPDFInfo returns information about the PDF
func (a *App) GetPDFInfo(path string) (*PDFInfo, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return nil, err
	}
	defer doc.Close()

	docInfo := doc.GetInfo()

	info := &PDFInfo{
		Path:         path,
		NumPages:     doc.NumPages(),
		Version:      doc.Version, // Version 是字段，不是方法
		Title:        docInfo.Title,
		Author:       docInfo.Author,
		Subject:      docInfo.Subject,
		Keywords:     docInfo.Keywords,
		Creator:      docInfo.Creator,
		Producer:     docInfo.Producer,
		CreationDate: docInfo.CreationDateRaw,
		ModDate:      docInfo.ModDateRaw,
		Encrypted:    docInfo.Encrypted,
		Tagged:       docInfo.Tagged,
		HasForms:     docInfo.Form != "none",
		Metadata:     docInfo.Custom,
	}

	return info, nil
}

// ==================== 页面操作 ====================

// PageInfo contains page information
type PageInfo struct {
	Number   int     `json:"number"`
	Width    float64 `json:"width"`
	Height   float64 `json:"height"`
	Rotation int     `json:"rotation"`
	MediaBox Box     `json:"mediaBox"`
	CropBox  Box     `json:"cropBox"`
}

type Box struct {
	LLX float64 `json:"llx"`
	LLY float64 `json:"lly"`
	URX float64 `json:"urx"`
	URY float64 `json:"ury"`
}

// GetPageInfo returns information about a specific page
func (a *App) GetPageInfo(path string, pageNum int) (*PageInfo, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return nil, err
	}
	defer doc.Close()

	if pageNum < 1 || pageNum > doc.NumPages() {
		return nil, fmt.Errorf("页码超出范围")
	}

	page, err := doc.GetPage(pageNum)
	if err != nil {
		return nil, fmt.Errorf("无法获取页面: %w", err)
	}

	mediaBox := page.GetMediaBox()
	cropBox := page.GetCropBox()

	info := &PageInfo{
		Number:   pageNum,
		Width:    page.Width(),
		Height:   page.Height(),
		Rotation: page.GetRotation(),
		MediaBox: Box{mediaBox.LLX, mediaBox.LLY, mediaBox.URX, mediaBox.URY},
		CropBox:  Box{cropBox.LLX, cropBox.LLY, cropBox.URX, cropBox.URY},
	}

	return info, nil
}

// GetAllPagesInfo returns information about all pages
func (a *App) GetAllPagesInfo(path string) ([]PageInfo, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return nil, err
	}
	defer doc.Close()

	numPages := doc.NumPages()
	pages := make([]PageInfo, numPages)

	for i := 1; i <= numPages; i++ {
		page, err := doc.GetPage(i)
		if err != nil {
			continue
		}

		mediaBox := page.GetMediaBox()
		cropBox := page.GetCropBox()

		pages[i-1] = PageInfo{
			Number:   i,
			Width:    page.Width(),
			Height:   page.Height(),
			Rotation: page.GetRotation(),
			MediaBox: Box{mediaBox.LLX, mediaBox.LLY, mediaBox.URX, mediaBox.URY},
			CropBox:  Box{cropBox.LLX, cropBox.LLY, cropBox.URX, cropBox.URY},
		}
	}

	return pages, nil
}

// ==================== 渲染功能 ====================

// RenderPDFPage renders a page to PNG and returns base64 encoded data
func (a *App) RenderPDFPage(path string, pageNum int, dpi float64) (string, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return "", err
	}
	defer doc.Close()

	if dpi <= 0 {
		dpi = 150
	}

	// 使用新的 API 渲染页面
	renderer := pdf.NewRenderer(doc)
	renderer.SetResolution(dpi, dpi)

	renderedImg, err := renderer.RenderPage(pageNum)
	if err != nil {
		return "", err
	}

	// 创建临时文件保存图像
	tmpFile, err := os.CreateTemp("", "page-*.png")
	if err != nil {
		return "", err
	}
	tmpPath := tmpFile.Name()
	tmpFile.Close()
	defer os.Remove(tmpPath)

	// 保存图像到临时文件
	err = renderer.SaveImage(renderedImg, tmpPath, "png")
	if err != nil {
		return "", err
	}

	// 读取文件内容
	pngData, err := os.ReadFile(tmpPath)
	if err != nil {
		return "", err
	}

	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngData), nil
}

// RenderPageToFile renders a page to a file
func (a *App) RenderPageToFile(path string, pageNum int, outputPath string, dpi float64, format string) error {
	doc, err := pdf.Open(path)
	if err != nil {
		return err
	}
	defer doc.Close()

	if dpi <= 0 {
		dpi = 300
	}

	renderer := pdf.NewRenderer(doc)
	renderer.SetResolution(dpi, dpi)

	renderedImg, err := renderer.RenderPage(pageNum)
	if err != nil {
		return err
	}

	return renderer.SaveImage(renderedImg, outputPath, format)
}

// ==================== 文本操作 ====================

// ExtractText extracts text from a page
func (a *App) ExtractText(path string, pageNum int) (string, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return "", err
	}
	defer doc.Close()

	extractor := pdf.NewTextExtractor(doc)
	return extractor.ExtractPageText(pageNum)
}

// ExtractAllText extracts text from all pages
func (a *App) ExtractAllText(path string) (string, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return "", err
	}
	defer doc.Close()

	extractor := pdf.NewTextExtractor(doc)
	return extractor.ExtractText()
}

// ==================== 注释操作 ====================

// AnnotationInfo represents an annotation
type AnnotationInfo struct {
	Type     string  `json:"type"`
	Subtype  string  `json:"subtype"`
	Contents string  `json:"contents"`
	Title    string  `json:"title"`
	Date     string  `json:"date"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Width    float64 `json:"width"`
	Height   float64 `json:"height"`
	Color    string  `json:"color"`
	URI      string  `json:"uri,omitempty"`
}

// GetAnnotations returns all annotations on a page
func (a *App) GetAnnotations(path string, pageNum int) ([]AnnotationInfo, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return nil, err
	}
	defer doc.Close()

	extractor := pdf.NewAnnotationExtractor(doc)
	annots, err := extractor.GetPageAnnotations(pageNum)
	if err != nil {
		return nil, err
	}

	results := make([]AnnotationInfo, len(annots))
	for i, annot := range annots {
		info := AnnotationInfo{
			Subtype:  annot.Subtype,
			Contents: annot.Contents,
			Title:    annot.Title,
			Date:     annot.Modified,
			X:        annot.Rect.LLX,
			Y:        annot.Rect.LLY,
			Width:    annot.Rect.URX - annot.Rect.LLX,
			Height:   annot.Rect.URY - annot.Rect.LLY,
		}
		if len(annot.Color) >= 3 {
			info.Color = fmt.Sprintf("#%02x%02x%02x",
				int(annot.Color[0]*255), int(annot.Color[1]*255), int(annot.Color[2]*255))
		}
		if annot.Action != nil && annot.Action.URI != "" {
			info.URI = annot.Action.URI
		}
		results[i] = info
	}
	return results, nil
}

// GetLinks returns all links on a page
func (a *App) GetLinks(path string, pageNum int) ([]AnnotationInfo, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return nil, err
	}
	defer doc.Close()

	extractor := pdf.NewAnnotationExtractor(doc)
	links, err := extractor.GetLinks(pageNum)
	if err != nil {
		return nil, err
	}

	results := make([]AnnotationInfo, len(links))
	for i, link := range links {
		info := AnnotationInfo{
			Subtype: link.Subtype,
			X:       link.Rect.LLX,
			Y:       link.Rect.LLY,
			Width:   link.Rect.URX - link.Rect.LLX,
			Height:  link.Rect.URY - link.Rect.LLY,
		}
		if link.Action != nil && link.Action.URI != "" {
			info.URI = link.Action.URI
		}
		results[i] = info
	}
	return results, nil
}

// ==================== 文档操作 ====================

// MergePDFs merges multiple PDF files
func (a *App) MergePDFs(inputPaths []string, outputPath string) error {
	if len(inputPaths) == 0 {
		return fmt.Errorf("没有输入文件")
	}

	docs := make([]*pdf.Document, len(inputPaths))
	for i, p := range inputPaths {
		doc, err := pdf.Open(p)
		if err != nil {
			// Close already opened docs
			for j := range i {
				docs[j].Close()
			}
			return err
		}
		docs[i] = doc
	}
	defer func() {
		for _, doc := range docs {
			doc.Close()
		}
	}()

	return pdf.MergeDocuments(docs, outputPath)
}

// SplitPDF splits a PDF into individual pages
func (a *App) SplitPDF(inputPath string, outputDir string) ([]string, error) {
	doc, err := pdf.Open(inputPath)
	if err != nil {
		return nil, err
	}
	defer doc.Close()

	baseName := strings.TrimSuffix(filepath.Base(inputPath), ".pdf")
	var outputPaths []string

	for i := 1; i <= doc.NumPages(); i++ {
		outputPath := filepath.Join(outputDir, fmt.Sprintf("%s_page_%d.pdf", baseName, i))
		err := pdf.ExtractPage(doc, i, outputPath)
		if err != nil {
			return outputPaths, err
		}
		outputPaths = append(outputPaths, outputPath)
	}

	return outputPaths, nil
}

// ExtractSinglePage extracts a single page from a PDF
func (a *App) ExtractSinglePage(inputPath string, pageNum int, outputPath string) error {
	doc, err := pdf.Open(inputPath)
	if err != nil {
		return err
	}
	defer doc.Close()

	return pdf.ExtractPage(doc, pageNum, outputPath)
}

// ==================== 导出功能 ====================

// ExportToText exports the document to plain text
func (a *App) ExportToText(path string, outputPath string) error {
	doc, err := pdf.Open(path)
	if err != nil {
		return err
	}
	defer doc.Close()

	extractor := pdf.NewTextExtractor(doc)
	text, err := extractor.ExtractText()
	if err != nil {
		return err
	}

	return os.WriteFile(outputPath, []byte(text), 0644)
}

// ExportToMarkdown exports the document to Markdown format
func (a *App) ExportToMarkdown(path string, outputPath string, includeImages bool) error {
	doc, err := pdf.Open(path)
	if err != nil {
		return err
	}
	defer doc.Close()

	// 创建 Markdown writer
	mdWriter := pdf.NewMarkdownWriter(doc, pdf.MarkdownOptions{
		IncludeImages:    includeImages,
		ExtractImages:    includeImages,
		ImagePrefix:      "image",
		PageSeparator:    "\n\n---\n\n",
		HeadingDetection: true,
	})

	// 创建输出文件
	f, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer f.Close()

	return mdWriter.Write(f)
}

// ExtractMarkdown extracts markdown from the entire document
func (a *App) ExtractMarkdown(path string, includeImages bool) (string, error) {
	markdown, err := pdf.ConvertToMarkdown(path, pdf.MarkdownOptions{
		IncludeImages:    includeImages,
		ExtractImages:    false, // 不提取图像文件，只返回文本
		PageSeparator:    "\n\n---\n\n",
		HeadingDetection: true,
	})
	return markdown, err
}

// ExtractPageMarkdown extracts markdown from a specific page
func (a *App) ExtractPageMarkdown(path string, pageNum int, includeImages bool) (string, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return "", err
	}
	defer doc.Close()

	// 创建 Markdown writer，只处理指定页面
	mdWriter := pdf.NewMarkdownWriter(doc, pdf.MarkdownOptions{
		FirstPage:        pageNum,
		LastPage:         pageNum,
		IncludeImages:    includeImages,
		ExtractImages:    false,
		HeadingDetection: true,
	})

	// 使用 strings.Builder 收集输出
	var builder strings.Builder
	err = mdWriter.Write(&builder)
	if err != nil {
		return "", err
	}

	return builder.String(), nil
}

// ExportToSVG exports a page to SVG format
func (a *App) ExportToSVG(path string, pageNum int, outputPath string) error {
	doc, err := pdf.Open(path)
	if err != nil {
		return err
	}
	defer doc.Close()

	renderer := pdf.NewCairoRenderer(doc, pdf.CairoOptions{
		FirstPage: pageNum,
		LastPage:  pageNum,
		Format:    "svg",
	})

	f, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer f.Close()

	return renderer.Render(f)
}

// ExportToPS exports the document to PostScript
func (a *App) ExportToPS(path string, outputPath string) error {
	doc, err := pdf.Open(path)
	if err != nil {
		return err
	}
	defer doc.Close()

	psWriter := pdf.NewPostScriptWriter(doc, pdf.PSOptions{
		Level: 2,
	})

	f, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer f.Close()

	return psWriter.Write(f)
}

// ==================== 元数据 ====================

// GetMetadata returns XMP metadata as string
func (a *App) GetMetadata(path string) (string, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return "", err
	}
	defer doc.Close()

	return doc.GetMetadata(), nil
}

// GetJavaScript returns all JavaScript in the document
func (a *App) GetJavaScript(path string) ([]string, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return nil, err
	}
	defer doc.Close()

	return doc.GetJavaScript(), nil
}

// GetNamedDestinations returns all named destinations
func (a *App) GetNamedDestinations(path string) (map[string]any, error) {
	doc, err := pdf.Open(path)
	if err != nil {
		return nil, err
	}
	defer doc.Close()

	return doc.GetNamedDestinations(), nil
}

// ==================== 选择文件对话框 ====================

// SelectPDFFiles opens a dialog to select multiple PDF files
func (a *App) SelectPDFFiles() ([]string, error) {
	paths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择 PDF 文件",
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF Files", Pattern: "*.pdf"},
		},
	})
	if err != nil {
		return nil, err
	}
	return paths, nil
}

// SelectOutputFile opens a dialog to select output file
func (a *App) SelectOutputFile(defaultName string, fileType string) (string, error) {
	filters := []runtime.FileFilter{
		{DisplayName: "PDF Files", Pattern: "*.pdf"},
	}

	// 根据文件类型添加不同的过滤器
	switch fileType {
	case "text":
		filters = []runtime.FileFilter{
			{DisplayName: "Text Files", Pattern: "*.txt"},
		}
	case "markdown":
		filters = []runtime.FileFilter{
			{DisplayName: "Markdown Files", Pattern: "*.md"},
		}
	case "svg":
		filters = []runtime.FileFilter{
			{DisplayName: "SVG Files", Pattern: "*.svg"},
		}
	case "ps":
		filters = []runtime.FileFilter{
			{DisplayName: "PostScript Files", Pattern: "*.ps"},
		}
	}

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "保存文件",
		DefaultFilename: defaultName,
		Filters:         filters,
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// SelectOutputDirectory opens a dialog to select output directory
func (a *App) SelectOutputDirectory() (string, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择输出目录",
	})
	if err != nil {
		return "", err
	}
	return path, nil
}
