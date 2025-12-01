package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/pdfcpu/pdfcpu/pkg/api"
)

// Layer 表示一个可编辑的图层
type Layer struct {
	ID      string  `json:"id"`
	Type    string  `json:"type"` // "background", "text", "image"
	X       float64 `json:"x"`
	Y       float64 `json:"y"`
	Width   float64 `json:"width"`
	Height  float64 `json:"height"`
	Content string  `json:"content"`
	Visible bool    `json:"visible"`
	// 文本属性
	FontSize  int    `json:"fontSize,omitempty"`
	FontColor string `json:"fontColor,omitempty"`
	FontFamily string `json:"fontFamily,omitempty"`
	// 图片属性
	ImageData string `json:"imageData,omitempty"` // base64编码的图片
}

// PSDDocument 表示一个类PSD的文档结构
type PSDDocument struct {
	FilePath   string  `json:"filePath"`
	PageNumber int     `json:"pageNumber"`
	Width      float64 `json:"width"`
	Height     float64 `json:"height"`
	Layers     []Layer `json:"layers"`
}

// ConvertPDFToPSD 将PDF页面转换为PSD格式（实际是图层结构）
func (a *App) ConvertPDFToPSD(filePath string, pageNum int) (*PSDDocument, error) {
	// 获取PDF页面信息
	pageCount, err := api.PageCountFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("获取页面数失败: %v", err)
	}

	if pageNum < 1 || pageNum > pageCount {
		return nil, fmt.Errorf("页码超出范围: %d (总页数: %d)", pageNum, pageCount)
	}

	// 创建临时目录提取页面
	tempDir := fmt.Sprintf("%s_psd_temp_%d", filePath, pageNum)
	os.MkdirAll(tempDir, 0755)
	defer os.RemoveAll(tempDir)

	// 提取单页
	pageStr := fmt.Sprintf("%d", pageNum)
	err = api.ExtractPagesFile(filePath, tempDir, []string{pageStr}, nil)
	if err != nil {
		return nil, fmt.Errorf("提取页面失败: %v", err)
	}

	// 读取提取的PDF
	files, err := os.ReadDir(tempDir)
	if err != nil || len(files) == 0 {
		return nil, fmt.Errorf("读取提取的页面失败")
	}

	extractedPDF := filepath.Join(tempDir, files[0].Name())
	pdfData, err := os.ReadFile(extractedPDF)
	if err != nil {
		return nil, fmt.Errorf("读取PDF数据失败: %v", err)
	}

	// 创建PSD文档结构
	psdDoc := &PSDDocument{
		FilePath:   filePath,
		PageNumber: pageNum,
		Width:      595, // A4宽度（点）
		Height:     842, // A4高度（点）
		Layers: []Layer{
			{
				ID:      "background",
				Type:    "background",
				X:       0,
				Y:       0,
				Width:   595,
				Height:  842,
				Content: base64.StdEncoding.EncodeToString(pdfData),
				Visible: true,
			},
		},
	}

	return psdDoc, nil
}

// SavePSDDocument 保存PSD文档结构到JSON文件
func (a *App) SavePSDDocument(psdDoc *PSDDocument, outputPath string) error {
	data, err := json.MarshalIndent(psdDoc, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化PSD文档失败: %v", err)
	}

	err = os.WriteFile(outputPath, data, 0644)
	if err != nil {
		return fmt.Errorf("保存PSD文档失败: %v", err)
	}

	return nil
}

// LoadPSDDocument 从JSON文件加载PSD文档
func (a *App) LoadPSDDocument(psdPath string) (*PSDDocument, error) {
	data, err := os.ReadFile(psdPath)
	if err != nil {
		return nil, fmt.Errorf("读取PSD文档失败: %v", err)
	}

	var psdDoc PSDDocument
	err = json.Unmarshal(data, &psdDoc)
	if err != nil {
		return nil, fmt.Errorf("解析PSD文档失败: %v", err)
	}

	return &psdDoc, nil
}

// AddLayerToPSD 向PSD文档添加图层
func (a *App) AddLayerToPSD(psdDoc *PSDDocument, layer Layer) *PSDDocument {
	psdDoc.Layers = append(psdDoc.Layers, layer)
	return psdDoc
}

// UpdateLayerInPSD 更新PSD文档中的图层
func (a *App) UpdateLayerInPSD(psdDoc *PSDDocument, layerID string, updates Layer) *PSDDocument {
	for i, layer := range psdDoc.Layers {
		if layer.ID == layerID {
			// 更新图层属性
			if updates.X != 0 {
				psdDoc.Layers[i].X = updates.X
			}
			if updates.Y != 0 {
				psdDoc.Layers[i].Y = updates.Y
			}
			if updates.Width != 0 {
				psdDoc.Layers[i].Width = updates.Width
			}
			if updates.Height != 0 {
				psdDoc.Layers[i].Height = updates.Height
			}
			if updates.Content != "" {
				psdDoc.Layers[i].Content = updates.Content
			}
			if updates.FontSize != 0 {
				psdDoc.Layers[i].FontSize = updates.FontSize
			}
			if updates.FontColor != "" {
				psdDoc.Layers[i].FontColor = updates.FontColor
			}
			psdDoc.Layers[i].Visible = updates.Visible
			break
		}
	}
	return psdDoc
}

// DeleteLayerFromPSD 从PSD文档删除图层
func (a *App) DeleteLayerFromPSD(psdDoc *PSDDocument, layerID string) *PSDDocument {
	newLayers := []Layer{}
	for _, layer := range psdDoc.Layers {
		if layer.ID != layerID {
			newLayers = append(newLayers, layer)
		}
	}
	psdDoc.Layers = newLayers
	return psdDoc
}

// ExportPSDToPDF 将PSD文档导出为PDF
// 注意：这是一个简化版本，实际需要使用图像处理库来合成图层
func (a *App) ExportPSDToPDF(psdDoc *PSDDocument, outputPath string) error {
	// 获取背景图层（原始PDF页面）
	var backgroundLayer *Layer
	for _, layer := range psdDoc.Layers {
		if layer.Type == "background" && layer.Visible {
			backgroundLayer = &layer
			break
		}
	}

	if backgroundLayer == nil {
		return fmt.Errorf("未找到背景图层")
	}

	// 解码背景PDF数据
	pdfData, err := base64.StdEncoding.DecodeString(backgroundLayer.Content)
	if err != nil {
		return fmt.Errorf("解码背景PDF失败: %v", err)
	}

	// 创建临时文件
	tempPDF := outputPath + ".temp.pdf"
	err = os.WriteFile(tempPDF, pdfData, 0644)
	if err != nil {
		return fmt.Errorf("写入临时PDF失败: %v", err)
	}
	defer os.Remove(tempPDF)

	// TODO: 这里需要将其他图层（文本、图片）叠加到PDF上
	// 目前先简单复制背景PDF
	// 实际实现需要使用pdfcpu的水印、注释等功能来添加图层内容

	// 处理文本图层
	for _, layer := range psdDoc.Layers {
		if layer.Type == "text" && layer.Visible && layer.Content != "" {
			// 使用pdfcpu添加文本水印
			err = api.AddTextWatermarksFile(tempPDF, tempPDF+".text.pdf", nil, false, layer.Content, "", nil)
			if err == nil {
				os.Remove(tempPDF)
				os.Rename(tempPDF+".text.pdf", tempPDF)
			}
		}
	}

	// 复制到最终输出
	finalData, err := os.ReadFile(tempPDF)
	if err != nil {
		return fmt.Errorf("读取最终PDF失败: %v", err)
	}

	err = os.WriteFile(outputPath, finalData, 0644)
	if err != nil {
		return fmt.Errorf("写入输出PDF失败: %v", err)
	}

	return nil
}

// GetPSDLayers 获取PSD文档的所有图层
func (a *App) GetPSDLayers(psdDoc *PSDDocument) []Layer {
	return psdDoc.Layers
}
