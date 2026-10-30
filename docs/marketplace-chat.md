# Respuestas de Marketplace · ADMIN · v1.4.4

La sección de Marketplace en `/servmacso10/contenidos` incluye el resolver y la descarga autenticada de `GET /api/admin/marketplace/script`. Solo ADMIN puede descargar y usar el resolver; los vendedores reciben 403. El publicador original no cambia.

El script distribuido está en `scripts/marketplace/macsomenos-chat-anuncio.user.js`. Reemplazar el script de respuestas en Tampermonkey de Firefox, guardar y recargar Messenger. El botón circular azul 🔗 aparece abajo a la derecha y se recupera si Facebook lo elimina u oculta. Actualizar el sitio no actualiza por sí solo la copia instalada en Tampermonkey.

Solo el clic real consulta el anuncio del chat y envía en la misma conversación. El saludo usa `America/Lima`; el texto es «aquí le dejo el link de mi catálogo donde podrá ver más fotos y detalles del equipo», seguido de la URL guardada del producto. Si cambia la conversación, hay un borrador, el producto está vendido/reservado o la resolución es ambigua, no envía. No hay reintentos automáticos del envío.

Requiere el endpoint backend `GET /admin/marketplace/resolve` del módulo marketplace-bridge, autenticado por JWT ADMIN. El proxy del sitio es `GET /api/admin/marketplace/resolve`. La ventana `/servmacso10/marketplace-resolver` utiliza la cookie del administrador sin copiar credenciales a Facebook. No necesita migraciones ni cambios de variables de entorno.

El HTML de Messenger aportado para diagnosticar el problema no contenía un SKU: sí una franja `PEN2,699 - Remato ...`. La extracción admite esa estructura y conversaciones `/messages/e2ee/t/`. Si necesita leer la publicación completa, solo acepta un SKU asociado al ID exacto del anuncio. Facebook puede no entregar SKU privados y puede aislar la ventana de autenticación; en ese caso el script informa el fallo.

La búsqueda por título admite también el título que genera el publicador. Si la coincidencia exacta inicial devuelve 404, consulta el JSON público existente del catálogo filtrado por familia/modelo, reutiliza `generateMarketplaceTitle` y `generateMarketplacePrice` y exige una coincidencia completa y única. Incluye RAM, almacenamiento, condición, batería, garantía y precio truncado como al publicar; no descarta esas palabras ni usa una tolerancia de precio. Si hay dos unidades con ese título y precio, responde 409. Si hay una, vuelve al resolver por `productId` para comprobar propietario, publicación, disponibilidad y slug actual. Las notas y candidatos no se devuelven al userscript. Los SKU/ID inexistentes y los errores de validación/permisos no activan esta alternativa. No modifica el publicador ni requiere reinstalar el script 1.4.4.

Caso real investigado: el título del catálogo `MacBook Neo A18 Pro 13` no es el título del anuncio. Los datos públicos del SKU MS-482 reproducen `Remato MacBook Neo A18 Pro 13” 8GB RAM 256GB SSD Open Box 100% Batería Garantía 5 de mayo de 2027` y el precio `2699` a partir de `2699.99`. Esta equivalencia se calcula; no se codifica un enlace ni un SKU para ese anuncio. Un anuncio editado manualmente o desactualizado que no coincida sigue sin enviarse.

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
