import SwiftUI
import AppKit

enum AppMode {
    case setup, teleprompter
}

struct ContentView: View {
    @EnvironmentObject var settings: AppSettings
    @StateObject private var speechEngine = SpeechEngine()
    @State private var script: String = ""
    @State private var mode: AppMode = .setup

    var body: some View {
        ZStack {
            switch mode {
            case .setup:
                SetupView(script: $script, onStart: startTeleprompter)
            case .teleprompter:
                TeleprompterScrollView(
                    script: script,
                    speechEngine: speechEngine,
                    onStop: stopTeleprompter
                )
            }
        }
        .frame(minWidth: 400, minHeight: 300)
        .onChange(of: settings.isAlwaysOnTop) { value in
            setWindowLevel(alwaysOnTop: value)
        }
        .onAppear {
            speechEngine.requestPermissions()
            setWindowLevel(alwaysOnTop: settings.isAlwaysOnTop)
        }
    }

    private func startTeleprompter() {
        guard !script.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        mode = .teleprompter
        speechEngine.start()
    }

    private func stopTeleprompter() {
        speechEngine.stop()
        mode = .setup
    }

    private func setWindowLevel(alwaysOnTop: Bool) {
        NSApplication.shared.windows.first?.level = alwaysOnTop ? .floating : .normal
    }
}
