import SwiftUI

class AppSettings: ObservableObject {
    @Published var isDarkTheme: Bool = true
    @Published var fontSize: CGFloat = 36
    @Published var speedMultiplier: Double = 1.0
    @Published var isAlwaysOnTop: Bool = true

    var foregroundColor: Color { isDarkTheme ? .white : .black }
    var backgroundColor: Color { isDarkTheme ? .black : .white }
}
