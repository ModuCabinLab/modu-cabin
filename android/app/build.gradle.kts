plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val webSource = rootProject.layout.projectDirectory.dir("../web")
val generatedWebAssets = layout.buildDirectory.dir("generated/webAssets")
val bundleWebAssets by tasks.registering(Sync::class) {
    from(webSource) {
        include("index.html", "styles.css", "app.js", "cabin-core.js", "ioniq5.jpg", "ioniq9.jpg", "palisade.jpg")
    }
    into(generatedWebAssets)
    doFirst {
        listOf("index.html", "styles.css", "app.js", "cabin-core.js", "ioniq5.jpg", "ioniq9.jpg", "palisade.jpg").forEach { name ->
            check(webSource.file(name).asFile.isFile) { "Missing web asset: $name in ../web" }
        }
    }
}

android {
    namespace = "io.moducabin.demo"
    compileSdk = 34
    buildToolsVersion = "34.0.0"

    defaultConfig {
        applicationId = "io.moducabin.demo"
        minSdk = 28
        targetSdk = 34
        versionCode = 4
        versionName = "0.3.0-submission"
    }
    sourceSets["main"].assets.srcDir(generatedWebAssets)
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildTypes {
        debug { isDebuggable = true }
        release {
            isDebuggable = false
            isMinifyEnabled = false
        }
    }
}

tasks.named("preBuild") { dependsOn(bundleWebAssets) }

dependencies {
    testImplementation("junit:junit:4.13.2")
}
