package io.moducabin.demo

import java.net.URI
import java.net.URISyntaxException

internal object LocalAssetPolicy {
    const val START_URL = "https://appassets.androidplatform.net/assets/index.html"
    private val assets = mapOf(
        "/assets/index.html" to "index.html",
        "/assets/styles.css" to "styles.css",
        "/assets/app.js" to "app.js",
        "/assets/cabin-core.js" to "cabin-core.js",
        "/assets/ioniq5.jpg" to "ioniq5.jpg",
        "/assets/ioniq9.jpg" to "ioniq9.jpg",
        "/assets/palisade.jpg" to "palisade.jpg"
    )

    fun assetPath(url: String): String? {
        val uri = try { URI(url) } catch (_: URISyntaxException) { return null }
        if (uri.scheme != "https" || uri.rawAuthority != "appassets.androidplatform.net") return null
        if (uri.rawQuery != null) return null
        return assets[uri.rawPath]
    }

    fun isDocument(url: String): Boolean = assetPath(url) == "index.html"
}
