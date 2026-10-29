# OutlierLab

MVP de analítica de canales de YouTube al estilo de ViewStats: análisis de canales, outliers, vídeos virales, nichos, cómo empezó cada canal, historial diario y señales de visitas compradas.

Todo es estático: `index.html` es la app completa y una tarea diaria de GitHub Actions guarda el historial en `data/`. No hay servidor que pagar ni mantener.

## Puesta en marcha (una sola vez)

1. **Clave de API.** En [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com) activa *YouTube Data API v3* y crea una clave en *Credenciales*. La cuota gratuita son 10.000 unidades al día.
2. **Secreto del repositorio.** En GitHub: *Settings → Secrets and variables → Actions → New repository secret*. Nombre `YT_API_KEY`, valor tu clave.
3. **Canales a seguir.** Edita `channels.txt`: un `@handle`, ID `UC…` o URL por línea.
4. **Primera foto.** *Actions → Foto diaria de canales → Run workflow*. Después se ejecuta sola cada día a las 06:00 UTC.
5. **Publicar la app.** *Settings → Pages → Deploy from a branch → `main` / root*. La app queda en `https://<tu-usuario>.github.io/<repo>/`.

En la app, el botón **Conectar YouTube** pide una clave para analizar cualquier canal al momento. Esa clave se guarda solo en tu navegador. Conviene usar una segunda clave restringida por *HTTP referrer* a tu dominio de GitHub Pages, y dejar la del secreto sin esa restricción para la tarea diaria.

## Qué hace cada sección

| Sección | Qué muestra | De dónde salen los datos |
|---|---|---|
| Canal | Suscriptores, mediana de vistas, vistas por suscriptor, ritmo, interacción, ingresos estimados, gráfico de los últimos vídeos | Últimos 100 vídeos (4 unidades de cuota) |
| Cómo empezó | 30 primeros vídeos públicos y el vídeo de despegue | Recorre toda la lista de subidas (1 unidad cada 50 vídeos) |
| Señales de alerta | Vídeos con interacción anómala y, con historial, picos y descuentos de vistas | Vídeos del canal + historial diario |
| Outliers | Vídeos que superan X veces la mediana de su canal, por formato | Canales analizados |
| Virales | Vídeos recientes por vistas al día | Canales analizados |
| Nichos | Comparativa de nichos y búsqueda por palabra clave (vistas frente a suscriptores) | Canales analizados + búsqueda (≈102 unidades) |
| Historial | Curva de suscriptores, vistas ganadas por día y alertas | `data/history/*.json`, generado por la tarea diaria |

Sin datos en `data/` (o abriendo el archivo directamente), la app muestra canales ficticios de ejemplo.

## Cómo se calculan las métricas

- **Outlier score**: vistas del vídeo ÷ mediana de vistas del canal en el mismo formato (Short ≤ 3 min o largo). Los vídeos de menos de 7 días se comparan con la mediana ajustada a su edad.
- **Interacción baja**: menos de un 0,5 % de likes por vista en vídeos largos (0,3 % en Shorts) con más de 5.000 vistas.
- **Pico sin suscriptores**: un día con más de 4× las vistas diarias habituales sin subida de suscriptores por encima de lo normal.
- **Vistas descontadas / caída de suscriptores**: el contador baja de un día para otro. Es la señal más fiable de que YouTube ha retirado visitas o cuentas falsas.
- **Ingresos estimados**: vistas de los vídeos de los últimos 30 días × un rango de RPM por nicho. Es orientativo, no son datos de YouTube.

## Límites de la API pública

- YouTube redondea los suscriptores a tres cifras significativas, y solo da la cifra actual: el historial empieza el día que empiezas a seguir el canal.
- Las fuentes de tráfico y los anuncios pagados solo los ve el dueño del canal. Para anuncios, consulta el [Centro de transparencia de anuncios de Google](https://adstransparency.google.com).
- Las alertas son indicios, no pruebas.
