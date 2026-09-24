# 价格计算规则（v2 · 2025-09 重构）

## 计价模式

保留简化模式：**展开面积 × 数量阶梯单价 + 版费（工艺开机费）**。

```
areaM2 = unfoldedLengthMm × unfoldedWidthMm ÷ 1,000,000
calculatedBase = areaM2 × tier.unitPricePerM2 × quantity
baseProductionAmount = max(calculatedBase, tier.minimumCharge)
工艺费 = Σ (process.setupFee + process.unitPrice × quantity × (billingMode==='area' ? areaM2 : 1))
goodsTotal = baseProductionAmount + 工艺费合计
shippingFee = goodsTotal ≥ freeShippingThreshold ? 0 : shipping.fee
total = goodsTotal + shippingFee
```

### 数量阶梯（区间匹配）

`quantityTiers` 按数量升序，`quantity` 字段表示**档位起点**：
数量 ≥ 档位起点时取该档单价；低于最小档位时按最小档单价与最低消费兜底（不再要求精确命中档位）。

```json
{
  "quantityTiers": [
    { "quantity": 500,  "unitPricePerM2": 8.4, "minimumCharge": 580 },
    { "quantity": 1000, "unitPricePerM2": 5.6, "minimumCharge": 850 },
    { "quantity": 2000, "unitPricePerM2": 5.1, "minimumCharge": 1080 },
    { "quantity": 3000, "unitPricePerM2": 4.6, "minimumCharge": 1380 },
    { "quantity": 5000, "unitPricePerM2": 4.0, "minimumCharge": 1900 },
    { "quantity": 10000, "unitPricePerM2": 3.9, "minimumCharge": 3700 }
  ],
  "processes": {
    "烫金":   { "billingMode": "area", "setupFee": 150, "unitPrice": 0.1 },
    "烫银":   { "billingMode": "area", "setupFee": 150, "unitPrice": 0.1 },
    "击凸":   { "billingMode": "area", "setupFee": 150, "unitPrice": 0.1 },
    "丝印UV": { "billingMode": "area", "setupFee": 150, "unitPrice": 0.1 },
    "贴窗口": { "billingMode": "area", "setupFee": 150, "unitPrice": 0.1 }
  }
}
```

## 盒形展开尺寸公式（系统内置，后台不可编辑）

公式逆向自分享印卡盒类目实测规则，硬编码在 `server/src/box-shapes.ts`；
前端镜像 `client/src/lib/box-shapes.js` 用于实时预览，服务端报价以自身公式为准。
单位 mm；变量：成品长 L、成品宽 W、成品高 H、纸板厚 T（默认 1.5）、盖高 C（默认 15）。

| 盒形 id | 名称 | 展开长 | 展开宽 | 额外参数 |
|---|---|---|---|---|
| double-insert | 双插盒 | (L+W)×2+15 | H+W×2+30 | — |
| lock-bottom | 锁底盒 | (L+W)×2+15 | max(15+W+H+0.18L+0.12W+10, 15+W+H+W÷2+W÷4) | — |
| auto-lock-bottom | 自动锁底盒 | (L+W)×2+15 | H+W+W÷2×1.4+15 | — |
| flat-glue | 平粘盒 | (L+W)×2+15 | H+W×2 | — |
| lid-base | 天地盒 | W×2+C×4+H×4+T×2+80 | max(H×4+L+T×2+30, L+W+30) | T、C |
| drawer | 抽屉盒 | H×5+T×2+W+L+65 | H×4+T×2+L+30 | T |
| integrated | 一体成型盒 | max(L+H×4, L+W×2÷3) | W×2+H×3 | — |

另有**自定义盒型**：客户在前台手动填写展开尺寸（`dimensionMode: 'manual'`），服务端校验为正数后直接参与计价。

## 接口

- `GET /api/v1/box-shapes`：公开返回内置盒形目录（id、名称、说明、所需参数、公式文案）。
- `POST /api/v1/storefront/:slug/quotes`：报价。请求体：
  ```json
  {
    "quantity": 1000,
    "shapeId": "double-insert",
    "finishedDimensions": { "length": 120, "width": 80, "height": 35, "thickness": 1.5, "cover": 15 },
    "dimensionMode": "auto",
    "processes": ["烫金"]
  }
  ```
  响应在原字段基础上新增 `boxShape`（{id,name,formulaText}）与 `quantityApplied`（实际命中的档位）。

## 已废弃（2025-09 重构移除）

- 数据表 `box_types`、`price_rules`（迁移脚本末尾自动 DROP）。
- 接口 `GET/POST/PATCH /merchant/:slug/box-types`、`GET/POST/PATCH /merchant/:slug/price-rules`。
- 线性展开规则（`unfoldRule.lengthLength/lengthWidth/…`）与报价时 `loadQuoteRules` 查表逻辑。
