# R8 rules for release builds (minifyEnabled + shrinkResources in app/build.gradle).
#
# Strategy: shrink unused code from the large SDKs (Firebase, Play Services,
# AndroidX, Kotlin...), which ship their own consumer rules, but keep the
# React Native libraries whole. Many of them are called from C++/JNI or by
# name through reflection, which R8 cannot see; stripping or renaming those
# classes crashes at runtime, not at build time.

# No renaming: crash stack traces stay readable without uploading mapping
# files, and JNI/reflection lookups by class name keep working. Most of the
# size win comes from removing unused code, not from shorter names.
-dontobfuscate

# ---- React Native core / native modules -----------------------------------
-keep class * implements com.facebook.react.ReactPackage { *; }
-keep class * extends com.facebook.react.bridge.BaseJavaModule { *; }
-keep class * implements com.facebook.react.turbomodule.core.interfaces.TurboModule { *; }
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }
-keep class * extends com.facebook.react.uimanager.ReactShadowNode { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keep @com.facebook.common.internal.DoNotStrip class * { *; }
-keepclassmembers class * { @com.facebook.common.internal.DoNotStrip *; }

# ---- Libraries called from native code / by reflection --------------------
# Agora + Iris (JNI). react-native-agora also ships consumer rules.
-keep class io.agora.** { *; }
-dontwarn io.agora.**
# Nitro modules: vision-camera, nitro-image, face detector, quick-sqlite (JSI/JNI)
-keep class com.margelo.** { *; }
-keep class com.mrousavy.** { *; }
# Reanimated / worklets / gesture handler / screens / svg (JSI and view managers)
-keep class com.swmansion.** { *; }
-keep class com.horcrux.svg.** { *; }
# Bluetooth attendance
-keep class it.innove.** { *; }
-keep class com.himelbrand.ble.peripheral.** { *; }
# Video (react-native-video / media3 is called through the view manager)
-keep class com.brentvatne.** { *; }
# Identity, auth, media and file helpers
-keep class com.withpersona.** { *; }
-keep class com.rnappauth.** { *; }
-keep class net.openid.appauth.** { *; }
-keep class com.reactnative.ivpusic.imagepicker.** { *; }
-keep class com.yalantis.ucrop.** { *; }
-dontwarn com.yalantis.ucrop.**
-keep class com.htmltopdf.** { *; }
-keep class com.rnbiometrics.** { *; }
-keep class com.zmxv.RNSound.** { *; }
-keep class com.rnfs.** { *; }
-keep class com.ReactNativeBlobUtil.** { *; }
-keep class com.reactnativecommunity.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.learnium.RNDeviceInfo.** { *; }
-keep class com.zoontek.rnpermissions.** { *; }
-keep class com.agontuk.RNFusedLocation.** { *; }
-keep class com.calendarevents.** { *; }
-keep class com.reactnativepagerview.** { *; }
-keep class com.BV.LinearGradient.** { *; }
-keep class fr.greweb.reactnativeviewshot.** { *; }
-keep class com.henninghall.date_picker.** { *; }
-keep class io.invertase.firebase.** { *; }
-keep class com.reactnativegooglesignin.** { *; }
-keep class com.imagepicker.** { *; }
-keep class com.reactnativedocumentpicker.** { *; }
-keep class com.reactnative.documentpicker.** { *; }
-keep class fr.bamlab.rnimageresizer.** { *; }
-keep class com.oblador.vectoricons.** { *; }
-keep class com.reactcommunity.rndatetimepicker.** { *; }
-keep class com.reactnativecommunity.webview.** { *; }

# WebView JavaScript bridges (Flutterwave checkout runs in a WebView)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Common transitive libraries that reference optional classes
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
