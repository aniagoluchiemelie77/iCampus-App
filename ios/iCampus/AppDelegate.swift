import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  var blurView: UIVisualEffectView?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "iCampus",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
  func applicationWillResignActive(_ application: UIApplication) {
        if blurView == nil {
            let blurEffect = UIBlurEffect(style: .dark) // You can use .light or .extraLight
            blurView = UIVisualEffectView(effect: blurEffect)
            blurView?.frame = window?.bounds ?? UIScreen.main.bounds
            
            // Add a logo or iCash icon in the center if you want
            let logo = UIImageView(image: UIImage(named: "1024")) 
            logo.contentMode = .scaleAspectFit
            logo.frame = CGRect(x: 0, y: 0, width: 100, height: 100)
            logo.center = blurView!.center
            blurView?.contentView.addSubview(logo)

            window?.addSubview(blurView!)
        }
    }
    func applicationDidBecomeActive(_ application: UIApplication) {
        blurView?.removeFromSuperview()
        blurView = nil
    }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
