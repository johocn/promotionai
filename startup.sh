#!/bin/bash

# PromotionAI 项目启动脚本

echo "================================="
echo "    PromotionAI 项目启动脚本"
echo "================================="

# 显示项目信息
echo "项目名称: PromotionAI"
echo "项目描述: AI驱动的智能促销系统"
echo "项目目录: $(pwd)"
echo ""

# 检查必需的目录
echo "检查项目目录结构..."
DIRECTORIES=("docs" "src" "tests" "config" "data" "logs")

for dir in "${DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
        echo "✓ $dir 目录存在"
    else
        echo "✗ $dir 目录不存在，正在创建..."
        mkdir -p "$dir"
    fi
done

echo ""
echo "项目目录结构检查完成!"
echo ""
echo "可用的子目录:"
echo "- docs/: 项目文档"
echo "- src/: 源代码"
echo "- tests/: 测试文件"
echo "- config/: 配置文件"
echo "- data/: 数据文件"
echo "- logs/: 日志文件"
echo ""

echo "PromotionAI 项目环境准备就绪!"
echo "================================="