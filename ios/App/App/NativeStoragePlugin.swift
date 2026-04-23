import Foundation
import Capacitor

@objc(NativeStoragePlugin)
public class NativeStoragePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeStoragePlugin"
    public let jsName = "NativeStorage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]

    private let keyPrefix = "amerymed.native."

    @objc public func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.isEmpty else {
            call.reject("A key is required.")
            return
        }

        let namespacedKey = keyPrefix + key
        let value = UserDefaults.standard.string(forKey: namespacedKey)
        call.resolve([
            "value": value as Any
        ])
    }

    @objc public func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.isEmpty else {
            call.reject("A key is required.")
            return
        }

        guard let value = call.getString("value") else {
            call.reject("A string value is required.")
            return
        }

        let namespacedKey = keyPrefix + key
        UserDefaults.standard.set(value, forKey: namespacedKey)
        call.resolve()
    }

    @objc public func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.isEmpty else {
            call.reject("A key is required.")
            return
        }

        let namespacedKey = keyPrefix + key
        UserDefaults.standard.removeObject(forKey: namespacedKey)
        call.resolve()
    }
}
