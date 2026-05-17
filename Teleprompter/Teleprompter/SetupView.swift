import SwiftUI

struct SetupView: View {
    @Binding var script: String
    var onStart: () -> Void
    @EnvironmentObject var settings: AppSettings

    var body: some View {
        VStack(spacing: 0) {
            toolbar
            Divider()
            editorArea
            Divider()
            bottomBar
        }
        .background(settings.backgroundColor)
    }

    private var toolbar: some View {
        HStack(spacing: 16) {
            Text("Teleprompter")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(settings.foregroundColor)

            Spacer()

            // Theme toggle
            Button {
                settings.isDarkTheme.toggle()
            } label: {
                Image(systemName: settings.isDarkTheme ? "sun.max.fill" : "moon.fill")
                    .foregroundColor(settings.foregroundColor)
            }
            .buttonStyle(.plain)
            .help(settings.isDarkTheme ? "Switch to Light" : "Switch to Dark")

            // Always on top toggle
            Button {
                settings.isAlwaysOnTop.toggle()
            } label: {
                Image(systemName: settings.isAlwaysOnTop ? "pin.fill" : "pin")
                    .foregroundColor(settings.isAlwaysOnTop ? .green : settings.foregroundColor)
            }
            .buttonStyle(.plain)
            .help(settings.isAlwaysOnTop ? "Unpin from top" : "Pin window on top")

            // Font size
            HStack(spacing: 6) {
                Button { settings.fontSize = max(18, settings.fontSize - 4) } label: {
                    Text("A").font(.system(size: 11)).foregroundColor(settings.foregroundColor)
                }
                .buttonStyle(.plain)
                .help("Decrease font size")

                Text("\(Int(settings.fontSize))pt")
                    .font(.system(size: 11))
                    .foregroundColor(settings.foregroundColor.opacity(0.6))
                    .frame(width: 36)

                Button { settings.fontSize = min(96, settings.fontSize + 4) } label: {
                    Text("A").font(.system(size: 16)).foregroundColor(settings.foregroundColor)
                }
                .buttonStyle(.plain)
                .help("Increase font size")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(settings.isDarkTheme ? Color.white.opacity(0.05) : Color.black.opacity(0.04))
    }

    private var editorArea: some View {
        ZStack(alignment: .topLeading) {
            if script.isEmpty {
                Text("Paste or type your script here…")
                    .font(.system(size: settings.fontSize * 0.6))
                    .foregroundColor(settings.foregroundColor.opacity(0.3))
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                    .allowsHitTesting(false)
            }
            TextEditor(text: $script)
                .font(.system(size: settings.fontSize * 0.6))
                .foregroundColor(settings.foregroundColor)
                .scrollContentBackground(.hidden)
                .background(Color.clear)
                .padding(12)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(settings.backgroundColor)
    }

    private var bottomBar: some View {
        HStack {
            if !script.isEmpty {
                Text("\(wordCount) words")
                    .font(.system(size: 11))
                    .foregroundColor(settings.foregroundColor.opacity(0.4))
            }
            Spacer()

            Button {
                script = ""
            } label: {
                Text("Clear")
                    .font(.system(size: 13))
                    .foregroundColor(settings.foregroundColor.opacity(0.6))
            }
            .buttonStyle(.plain)
            .opacity(script.isEmpty ? 0 : 1)

            Button(action: onStart) {
                HStack(spacing: 6) {
                    Image(systemName: "mic.fill")
                    Text("Start")
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 18)
                .padding(.vertical, 8)
                .background(script.isEmpty ? Color.green.opacity(0.4) : Color.green)
                .cornerRadius(8)
            }
            .buttonStyle(.plain)
            .disabled(script.isEmpty)
            .help("Start teleprompter")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(settings.isDarkTheme ? Color.white.opacity(0.05) : Color.black.opacity(0.04))
    }

    private var wordCount: Int {
        script.split(whereSeparator: \.isWhitespace).count
    }
}
