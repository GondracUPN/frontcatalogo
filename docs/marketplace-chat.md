# Respuestas de Marketplace · ADMIN · v1.4.4

La sección de Marketplace en `/servmacso10/contenidos` incluye el resolver y la descarga autenticada de `GET /api/admin/marketplace/script`. Solo ADMIN puede descargar y usar el resolver; los vendedores reciben 403. El publicador original no cambia.

El script distribuido está en `scripts/marketplace/macsomenos-chat-anuncio.user.js`. Reemplazar el script de respuestas en Tampermonkey de Firefox, guardar y recargar Messenger. El botón circular azul 🔗 aparece abajo a la derecha y se recupera si Facebook lo elimina u oculta. Actualizar el sitio no actualiza por sí solo la copia instalada en Tampermonkey.

Solo el clic real consulta el anuncio del chat y envía en la misma conversación. El saludo usa `America/Lima`; el texto es «aquí le dejo el link de mi catálogo donde podrá ver más fotos y detalles del equipo», seguido de la URL guardada del producto. Si cambia la conversación, hay un borrador, el producto está vendido/reservado o la resolución es ambigua, no envía. No hay reintentos automáticos del envío.

Requiere el endpoint backend `GET /admin/marketplace/resolve` del módulo marketplace-bridge, autenticado por JWT ADMIN. El proxy del sitio es `GET /api/admin/marketplace/resolve`. La ventana `/servmacso10/marketplace-resolver` utiliza la cookie del administrador sin copiar credenciales a Facebook. No necesita migraciones ni cambios de variables de entorno.

El HTML de Messenger aportado para diagnosticar el problema no contenía un SKU: sí una franja `PEN2,699 - Remato ...`. La extracción admite esa estructura y conversaciones `/messages/e2ee/t/`. Si necesita leer la publicación completa, solo acepta un SKU asociado al ID exacto del anuncio. El título/precio alternativo debe coincidir de forma verificable con el catálogo: títulos con palabras extra pueden responder 404. Facebook puede no entregar SKU privados y puede aislar la ventana de autenticación; en ese caso el script informa el fallo.

Validación:

```powershell
npm run test:marketplace-resolver
npm run test:marketplace-chat
$env:MACSO_TEST_BROWSER = 'firefox'
npm run test:marketplace-chat
npm run lint
npm run build
```

El test del proxy comprueba permisos, respuesta JSON, errores, no-store y descarga ADMIN. La batería del script incluye 39 escenarios por navegador, con páginas y API simuladas. No envía mensajes reales ni sustituye probar la cuenta real de Facebook. Los motores Chromium/Firefox de Playwright deben estar instalados para ejecutar esa batería.
