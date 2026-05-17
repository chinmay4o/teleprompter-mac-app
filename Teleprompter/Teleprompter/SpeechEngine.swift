import AVFoundation
import Speech

class SpeechEngine: ObservableObject {
    @Published var isSpeaking: Bool = false
    @Published var wordsPerMinute: Double = 130
    @Published var permissionGranted: Bool = false
    @Published var errorMessage: String? = nil

    private var audioEngine = AVAudioEngine()
    private var speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?

    private var silenceTimer: Timer?
    private var wordCountHistory: [(Date, Int)] = []
    private var lastWordCount: Int = 0
    private var wpmSmoothingBuffer: [Double] = []
    private let silenceThreshold: TimeInterval = 0.4
    private let rmsThreshold: Float = 0.01

    func requestPermissions() {
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                guard let self else { return }
                switch status {
                case .authorized:
                    AVCaptureDevice.requestAccess(for: .audio) { granted in
                        DispatchQueue.main.async {
                            self.permissionGranted = granted
                            if !granted {
                                self.errorMessage = "Microphone access denied."
                            }
                        }
                    }
                default:
                    self.errorMessage = "Speech recognition permission denied."
                }
            }
        }
    }

    func start() {
        guard permissionGranted else { requestPermissions(); return }
        do {
            try startEngine()
        } catch {
            DispatchQueue.main.async { self.errorMessage = error.localizedDescription }
        }
    }

    func stop() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
        silenceTimer?.invalidate()
        DispatchQueue.main.async {
            self.isSpeaking = false
            self.wordCountHistory = []
            self.lastWordCount = 0
            self.wpmSmoothingBuffer = []
        }
    }

    private func startEngine() throws {
        if audioEngine.isRunning { stop() }

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        recognitionRequest?.shouldReportPartialResults = true
        recognitionRequest?.requiresOnDeviceRecognition = false

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest!) { [weak self] result, error in
            guard let self, let result else { return }
            let count = result.bestTranscription.segments.count
            DispatchQueue.main.async {
                if count > self.lastWordCount {
                    let delta = count - self.lastWordCount
                    self.lastWordCount = count
                    self.recordWords(delta)
                }
            }
        }

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            guard let self else { return }
            self.recognitionRequest?.append(buffer)
            let rms = self.calculateRMS(buffer: buffer)
            DispatchQueue.main.async {
                if rms > self.rmsThreshold {
                    self.onSpeechDetected()
                }
            }
        }

        audioEngine.prepare()
        try audioEngine.start()
    }

    private func calculateRMS(buffer: AVAudioPCMBuffer) -> Float {
        guard let channelData = buffer.floatChannelData?[0] else { return 0 }
        let frameCount = Int(buffer.frameLength)
        var sum: Float = 0
        for i in 0..<frameCount { sum += channelData[i] * channelData[i] }
        return sqrt(sum / Float(frameCount))
    }

    private func onSpeechDetected() {
        if !isSpeaking { isSpeaking = true }
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: silenceThreshold, repeats: false) { [weak self] _ in
            self?.isSpeaking = false
        }
    }

    private func recordWords(_ count: Int) {
        let now = Date()
        wordCountHistory.append((now, count))
        // Keep only last 10 seconds of history
        wordCountHistory = wordCountHistory.filter { now.timeIntervalSince($0.0) < 10 }
        let totalWords = wordCountHistory.map(\.1).reduce(0, +)
        let elapsed = now.timeIntervalSince(wordCountHistory.first?.0 ?? now)
        guard elapsed > 0 else { return }
        let wpm = (Double(totalWords) / elapsed) * 60
        wpmSmoothingBuffer.append(wpm)
        if wpmSmoothingBuffer.count > 5 { wpmSmoothingBuffer.removeFirst() }
        let smoothed = wpmSmoothingBuffer.reduce(0, +) / Double(wpmSmoothingBuffer.count)
        wordsPerMinute = max(60, min(smoothed, 300))
    }
}
