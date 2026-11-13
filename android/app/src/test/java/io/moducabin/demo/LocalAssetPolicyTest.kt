package io.moducabin.demo

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalAssetPolicyTest {
    @Test
    fun bundledResourcesResolveWithoutNetwork() {
        assertEquals("index.html", LocalAssetPolicy.assetPath("https://appassets.androidplatform.net/assets/index.html"))
        assertEquals("styles.css", LocalAssetPolicy.assetPath("https://appassets.androidplatform.net/assets/styles.css"))
        assertEquals("app.js", LocalAssetPolicy.assetPath("https://appassets.androidplatform.net/assets/app.js"))
        assertEquals("cabin-core.js", LocalAssetPolicy.assetPath("https://appassets.androidplatform.net/assets/cabin-core.js"))
        assertTrue(LocalAssetPolicy.isDocument("https://appassets.androidplatform.net/assets/index.html#demo"))
        assertFalse(LocalAssetPolicy.isDocument("https://appassets.androidplatform.net/assets/app.js"))
    }

    @Test
    fun bundledVehiclePhotographsResolveButCannotBecomeDocuments() {
        assertEquals("ioniq5.jpg", LocalAssetPolicy.assetPath("https://appassets.androidplatform.net/assets/ioniq5.jpg"))
        assertEquals("ioniq9.jpg", LocalAssetPolicy.assetPath("https://appassets.androidplatform.net/assets/ioniq9.jpg"))
        assertEquals("palisade.jpg", LocalAssetPolicy.assetPath("https://appassets.androidplatform.net/assets/palisade.jpg"))
        assertFalse(LocalAssetPolicy.isDocument("https://appassets.androidplatform.net/assets/ioniq5.jpg"))
        assertFalse(LocalAssetPolicy.isDocument("https://appassets.androidplatform.net/assets/ioniq9.jpg"))
        assertFalse(LocalAssetPolicy.isDocument("https://appassets.androidplatform.net/assets/palisade.jpg"))
    }

    @Test
    fun unlistedPhotographsAndRemoteImageUrlsAreDenied() {
        listOf(
            "https://appassets.androidplatform.net/assets/other.jpg",
            "https://appassets.androidplatform.net/assets/ioniq5.jpeg",
            "https://appassets.androidplatform.net/assets/IONIQ5.jpg",
            "https://appassets.androidplatform.net/assets/%69oniq5.jpg",
            "https://appassets.androidplatform.net/assets/ioniq5.jpg/extra",
            "https://appassets.androidplatform.net/assets/ioniq5.jpg?remote=true",
            "https://example.com/assets/ioniq5.jpg"
        ).forEach { url -> assertNull("Must deny $url", LocalAssetPolicy.assetPath(url)) }
    }

    @Test
    fun foreignOriginsAndDangerousSchemesAreDenied() {
        listOf(
            "https://example.com/assets/index.html",
            "http://appassets.androidplatform.net/assets/index.html",
            "https://appassets.androidplatform.net.evil.example/assets/index.html",
            "https://evil.example@appassets.androidplatform.net/assets/index.html",
            "https://appassets.androidplatform.net:443/assets/index.html",
            "file:///android_asset/index.html",
            "content://io.moducabin.demo/index.html",
            "javascript:alert(1)",
            "data:text/html,external",
            "intent://external#Intent;end",
            "//appassets.androidplatform.net/assets/index.html",
            "this is not a URL"
        ).forEach { url -> assertNull("Must deny $url", LocalAssetPolicy.assetPath(url)) }
    }

    @Test
    fun unbundledAndEncodedTraversalPathsAreDenied() {
        listOf(
            "https://appassets.androidplatform.net/assets/secret.txt",
            "https://appassets.androidplatform.net/assets/../index.html",
            "https://appassets.androidplatform.net/assets/%2e%2e/index.html",
            "https://appassets.androidplatform.net/assets/%69ndex.html",
            "https://appassets.androidplatform.net/assets/index.html?url=https://example.com",
            "https://appassets.androidplatform.net/assets/index.html/extra"
        ).forEach { url -> assertNull("Must deny $url", LocalAssetPolicy.assetPath(url)) }
    }
}
