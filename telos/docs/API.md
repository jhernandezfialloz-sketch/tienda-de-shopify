# API REST de Telos

Base: `/api`. Autenticación: cookie de sesión `telos_session` (iniciar sesión en `/admin/login`).
Claves de API para integraciones: Fase 4.

Respuesta exitosa: `{ "data": … }` (201 en POST). Error:

```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Stock insuficiente para TLS-CMT-001-BLK-M: hay 2, se intentó descontar 3.", "details": { "sku": "…", "available": 2, "requested": 3 } } }
```

| Código | HTTP |
|---|---|
| VALIDATION | 422 |
| UNAUTHENTICATED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| CONFLICT, INSUFFICIENT_STOCK, INVALID_TRANSITION | 409 |
| INTERNAL | 500 |

Montos: strings decimales en Lempiras (`"600.00"`). Fechas: ISO 8601 UTC.

## Productos

`GET /api/products?q=&categoryId=&status=DRAFT|ACTIVE|ARCHIVED&page=&pageSize=` — permiso `products:read`.

`POST /api/products` — `products:write` (+ `inventory:adjust` si incluye `initialStock`):

```json
{
  "name": "Camisa Oxford azul", "categoryId": "…", "brand": "…", "description": "…", "material": "100% algodón",
  "status": "DRAFT", "minimumStock": 2, "internalNotes": "…",
  "variants": [{ "color": "Azul", "size": "M", "sku": "(opcional)", "barcode": "…", "price": "850", "cost": "420", "minimumStock": 1, "initialStock": 5 }]
}
```

`GET /api/products/:id` (id interno o código `TLS-CMT-001`). `PATCH /api/products/:id` (mismo cuerpo; variantes existentes con `id`; el stock no se cambia aquí). `DELETE /api/products/:id` archiva.

## Inventario

`GET /api/inventory?q=&filter=all|low|out&page=` — `inventory:read`. Devuelve `summary` (unidades, valor a costo y a precio, agotados, bajos) y `rows`.

`POST /api/inventory/adjustments` — `inventory:adjust`:

```json
{ "variantId": "…", "type": "AJUSTE|CORRECCION|DANO|PERDIDA|DEVOLUCION|INICIAL", "quantity": 3, "direction": "in|out (solo AJUSTE)", "reason": "Conteo semanal" }
```

`CORRECCION`: `quantity` es la cantidad contada; el sistema calcula la diferencia.

## Ventas

`GET /api/sales?q=&status=&channel=&page=` — `sales:read`.

`POST /api/sales` — `sales:write`:

```json
{
  "idempotencyKey": "uuid-del-formulario",
  "channel": "INSTAGRAM", "paymentMethod": "Transferencia", "discount": "50",
  "customerId": "…", "newCustomer": { "name": "…", "phone": "…", "city": "…" },
  "confirm": true, "markPaid": false, "notes": "…",
  "items": [{ "variantId": "…", "quantity": 2, "unitPrice": "(opcional, por defecto el de la variante)", "discount": "0" }]
}
```

Canales: `TIENDA, INSTAGRAM, FACEBOOK, TIKTOK, WHATSAPP, REFERIDO, VENTA_DIRECTA, MARKETPLACE, WEB, OTRO`.

`POST /api/sales/:id/transition` `{ "to": "CONFIRMADA|ENTREGADA|CANCELADA|DEVUELTA", "reason": "…" }` — cancelar/devolver requiere `sales:cancel`.

`POST /api/sales/:id/payments` `{ "amount": "500", "method": "Efectivo", "reference": "…" }`.

## Compras

`GET /api/purchases?q=&status=&page=` — `purchases:read`.

`POST /api/purchases` — `purchases:write`:

```json
{ "supplierId": "…", "status": "BORRADOR|ORDENADA", "shippingCost": "300", "taxes": "200", "otherCosts": "0",
  "paymentMethod": "Transferencia", "notes": "…", "items": [{ "variantId": "…", "quantity": 10, "unitCost": "350" }] }
```

`POST /api/purchases/:id/transition` `{ "to": "ORDENADA|ENVIADA|RECIBIDA|CANCELADA" }` — `RECIBIDA` requiere `purchases:receive` y suma inventario.

## Búsqueda

`GET /api/search?q=` — productos, SKU, ventas, compras, clientes, proveedores.
`GET /api/variants/search?q=` — variantes vendibles (SKU, nombre, código de barras).
