# Respuestas de Marketplace · ADMIN · v1.4.5

La sección de Marketplace en `/servmacso10/contenidos` incluye el resolver y la descarga autenticada de `GET /api/admin/marketplace/script`. Solo ADMIN puede descargar y usar el resolver; los vendedores reciben 403. El publicador original no cambia.

Instalar/reemplazar `scripts/marketplace/macsomenos-chat-anuncio.user.js` versión 1.4.5 en cada navegador y mantener una sesión ADMIN de Macsomenos en cada uno. Las cuentas de Facebook pueden ser distintas. El primer clic que identifica correctamente cada anuncio guarda su ID en el servidor; los siguientes consultan el vínculo directamente. El botón sigue siendo el círculo azul 🔗 abajo a la derecha. Actualizar el sitio no actualiza la copia instalada en Tampermonkey.

`GET /api/admin/marketplace/resolve?listingId=...` consulta primero el vínculo y verifica producto/slug/reservas. Sigue siendo de solo lectura. Tras identificar un anuncio todavía no vinculado, la ventana ADMIN llama a `POST /api/admin/marketplace/listings` con ID, SKU/URL verificados y título/precio leídos. El POST exige ADMIN y origen del sitio. Tres IDs de anuncios pueden apuntar al mismo equipo. Un ID asociado a otro producto produce 409; si se elimina el producto, se conserva el vínculo sin producto para impedir una reasignación silenciosa.

Solo el clic real consulta el anuncio del chat y envía en la misma conversación. El saludo usa `America/Lima`; el texto es «aquí le dejo el link de mi catálogo donde podrá ver más fotos y detalles del equipo», seguido de la URL guardada del producto. Si cambia la conversación, hay un borrador, el producto está vendido/reservado o la resolución es ambigua, no envía. No hay reintentos automáticos del envío.

El backend expone `GET /admin/marketplace/resolve`, `GET /admin/marketplace/listings/:listingId` y `POST /admin/marketplace/listings`, todos ADMIN. La ventana utiliza la cookie del administrador sin copiar credenciales a Facebook. El primer POST crea de forma aditiva la tabla `marketplace_listing_links`, siguiendo el patrón existente del bridge; los GET nunca la crean. No requiere cambios de variables ni modifica productos, precios, SKU o el publicador.

El HTML de Messenger aportado para diagnosticar el problema no contenía un SKU: sí una franja `PEN2,699 - Remato ...`. La extracción admite esa estructura y conversaciones `/messages/e2ee/t/`. Si necesita leer la publicación completa, solo acepta un SKU asociado al ID exacto del anuncio. Facebook puede no entregar SKU privados y puede aislar la ventana de autenticación; en ese caso el script informa el fallo.

La búsqueda por título reutiliza `generateMarketplaceTitle` y `generateMarketplacePrice`. Exige título generado/precio exactos y una única unidad; después vuelve al resolver por ID. No devuelve notas ni candidatos. Los SKU/ID inexistentes y los errores de validación/permisos no activan esa alternativa. La versión 1.4.4 sigue resolviendo, pero necesita actualizarse a 1.4.5 para enviar los IDs y registrar vínculos compartidos.

El caso MacBook Neo MS-482 reproduce el anuncio con RAM/SSD/batería/garantía a partir de los datos actuales. El Mac mini MS-385 conserva en `descripcionOtro` el título anterior `Apple Mac mini M4`, mientras el catálogo normaliza el título con CPU/GPU. Se acepta ese título de origen solo para Mac mini/iMac cuando familia y chip coinciden; M4 y M4 Pro siguen siendo distintos. El precio de publicación actual usa la promoción `3199`. No se codifica un SKU/enlace para esos anuncios.

Los errores distinguen precio cambiado y título distinto; el script muestra el mensaje y los datos leídos (anuncio, SKU si aparece, título y precio). No incluye mensajes ni datos del comprador.

Validación:

```powershell
npm run test:marketplace-resolver
npm run test:marketplace-chat
$env:MACSO_TEST_BROWSER = 'firefox'
npm run test:marketplace-chat
npm run lint
npm run build
```

Pasaron las pruebas del proxy/registro, los casos Mac mini con precio promocional y 44 escenarios en cada motor Chromium/Firefox aislado. Incluyen tres sesiones y tres anuncios que comparten SKU, reutilización del vínculo, rechazo al registrar otro equipo y los controles anteriores. No se enviaron mensajes reales a compradores. Los motores Playwright deben estar instalados para repetir la batería.
