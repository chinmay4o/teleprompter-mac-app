import SwiftUI

struct TeleprompterScrollView: View {
    let script: String
    @ObservedObject var speechEngine: SpeechEngine
    @EnvironmentObject var settings: AppSettings
    var onStop: () -> Void

    @State private var scrollOffset: CGFloat = 0
    @State private var contentHeight: CGFloat = 0
    @State private var containerHeight: CGFloat = 0
    @State private var scrollTimer: Timer? = nil
    @State private var showControls: Bool = false

    // Fraction of container height where the reading line sits (upper third = eye-level under camera)
    private let readingLineFraction: CGFloat = 0.35

    // Pixels per second based on WPM: average 5 chars/word, font-based char width
    private var pixelsPerSecond: CGFloat {
        let wpm = speechEngine.wordsPerMinute
        let linesPerMinute = wpm / 8.0  // ~8 words per line at typical font
        let lineHeight = settings.fontSize * 1.6
        return CGFloat(linesPerMinute) * lineHeight / 60.0 * CGFloat(settings.speedMultiplier)
    }

    var body: some View {
        ZStack {
            settings.backgroundColor.ignoresSafeArea()

            GeometryReader { geo in
                let fullHeight = geo.size.height

                ZStack(alignment: .top) {
                    // Scrolling content
                    VStack(alignment: .leading, spacing: 0) {
                        Color.clear.frame(height: fullHeight * readingLineFraction)
                        Text(script)
                            .font(.system(size: settings.fontSize, weight: .medium))
                            .foregroundColor(settings.foregroundColor)
                            .lineSpacing(settings.fontSize * 0.4)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 32)
                            .background(heightReader)
                        Color.clear.frame(height: fullHeight)
                    }
                    .offset(y: -scrollOffset)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .clipped()
                .onAppear {
                    containerHeight = fullHeight
                    startScrollLoop()
                }
                .onChange(of: geo.size) { newSize in
                    containerHeight = newSize.height
                }
            }

            // Focus line at reading position (upper third)
            GeometryReader { geo in
                Rectangle()
                    .fill(speechEngine.isSpeaking ? Color.green.opacity(0.7) : Color.white.opacity(0.15))
                    .frame(height: 2)
                    .offset(y: geo.size.height * readingLineFraction)
                    .animation(.easeInOut(duration: 0.2), value: speechEngine.isSpeaking)
            }

            // Overlay controls (hover to reveal)
            VStack {
                HStack {
                    Spacer()
                    overlayControls
                        .onHover { hovering in
                            withAnimation(.easeInOut(duration: 0.15)) { showControls = hovering }
                        }
                }
                Spacer()
            }
        }
        .onDisappear(perform: stopScrollLoop)
    }

    private var heightReader: some View {
        GeometryReader { g in
            Color.clear.onAppear { contentHeight = g.size.height }
                .onChange(of: g.size) { contentHeight = $0.height }
        }
    }

    private var overlayControls: some View {
        HStack(spacing: 10) {
            if showControls {
                Button("Reset") { scrollOffset = 0 }
                    .buttonStyle(OverlayButtonStyle())
                Button("Stop") { onStop() }
                    .buttonStyle(OverlayButtonStyle())
                HStack(spacing: 6) {
                    Text("Speed").foregroundColor(.white).font(.system(size: 11))
                    Slider(value: $settings.speedMultiplier, in: 0.3...3.0)
                        .frame(width: 80)
                    Text(String(format: "%.1fx", settings.speedMultiplier))
                        .foregroundColor(.white).font(.system(size: 11))
                }
            }
            // Mic indicator
            Circle()
                .fill(speechEngine.isSpeaking ? Color.green : Color.gray.opacity(0.4))
                .frame(width: 10, height: 10)
                .animation(.easeInOut(duration: 0.15), value: speechEngine.isSpeaking)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
        .cornerRadius(20)
        .padding(16)
    }

    private func startScrollLoop() {
        stopScrollLoop()
        scrollTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { _ in
            guard speechEngine.isSpeaking else { return }
            let maxScroll = max(0, contentHeight)
            guard scrollOffset < maxScroll else { return }
            let increment = pixelsPerSecond / 60.0
            DispatchQueue.main.async {
                scrollOffset = min(self.scrollOffset + increment, maxScroll)
            }
        }
    }

    private func stopScrollLoop() {
        scrollTimer?.invalidate()
        scrollTimer = nil
    }
}

struct OverlayButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundColor(.white)
            .font(.system(size: 12, weight: .medium))
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(configuration.isPressed ? Color.white.opacity(0.3) : Color.white.opacity(0.12))
            .cornerRadius(8)
    }
}
