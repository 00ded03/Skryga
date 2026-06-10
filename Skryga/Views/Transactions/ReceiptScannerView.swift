// ReceiptScannerView.swift
// Skryga — Receipt / screenshot scanner with OCR

import SwiftUI
import UIKit
import Vision

// MARK: - OCRService

/// Placeholder OCR service using Vision framework text recognition.
/// Replace the category/amount parsing logic with production heuristics.
class OCRService {

    struct ScanResult {
        var amount: Double?
        var merchantName: String?
        var date: Date?
        var suggestedCategoryKey: String?
        var suggestedSubcategoryKey: String?
        var rawText: String
    }

    // MARK: - Public API

    func scanReceipt(image: UIImage) async -> ScanResult {
        let raw = await recognizeText(in: image)
        return parse(rawText: raw)
    }

    func scanApplePayScreenshot(image: UIImage) async -> ScanResult {
        let raw = await recognizeText(in: image)
        return parse(rawText: raw, isScreenshot: true)
    }

    // MARK: - Vision OCR

    private func recognizeText(in image: UIImage) async -> String {
        guard let cgImage = image.cgImage else { return "" }

        return await withCheckedContinuation { continuation in
            let request = VNRecognizeTextRequest { req, _ in
                let observations = req.results as? [VNRecognizedTextObservation] ?? []
                let lines = observations.compactMap { obs in
                    obs.topCandidates(1).first?.string
                }
                continuation.resume(returning: lines.joined(separator: "\n"))
            }
            request.recognitionLevel   = .accurate
            request.recognitionLanguages = ["he-IL", "en-US", "ru-RU"]
            request.usesLanguageCorrection = true

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            try? handler.perform([request])
        }
    }

    // MARK: - Parsing

    private func parse(rawText: String, isScreenshot: Bool = false) -> ScanResult {
        var result = ScanResult(rawText: rawText)

        // -- Amount: look for ₪ / ש"ח patterns or bare numbers near currency keywords
        let amountPatterns = [
            #"₪\s*([\d,]+\.?\d*)"#,
            #"([\d,]+\.?\d*)\s*₪"#,
            #"([\d,]+\.?\d*)\s*ש[""״]ח"#,
            #"סה[""״]כ\s*:?\s*([\d,]+\.?\d*)"#,
            #"total\s*:?\s*\$?([\d,]+\.?\d*)"#i
        ]
        for pattern in amountPatterns {
            if let amount = extractDouble(from: rawText, pattern: pattern) {
                result.amount = amount
                break
            }
        }

        // -- Merchant: largest / first text block (usually the store name at the top)
        let lines = rawText
            .components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        result.merchantName = lines.first(where: { line in
            line.count > 3 &&
            !line.allSatisfy({ $0.isNumber || $0 == "." || $0 == "," }) &&
            !line.hasPrefix("₪")
        })

        // -- Date: look for common Israeli date formats
        let datePatterns = [
            #"(\d{1,2})[./](\d{1,2})[./](\d{4})"#,
            #"(\d{4})-(\d{2})-(\d{2})"#
        ]
        for pattern in datePatterns {
            if let date = extractDate(from: rawText, pattern: pattern) {
                result.date = date
                break
            }
        }

        // -- Category hint: keyword matching
        let lower = rawText.lowercased()
        result.suggestedCategoryKey = suggestCategory(from: lower)

        return result
    }

    // MARK: - Helpers

    private func extractDouble(from text: String, pattern: String) -> Double? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else { return nil }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = regex.firstMatch(in: text, range: range),
              match.numberOfRanges > 1,
              let numRange = Range(match.range(at: 1), in: text)
        else { return nil }
        let numStr = text[numRange].replacingOccurrences(of: ",", with: "")
        return Double(numStr)
    }

    private func extractDate(from text: String, pattern: String) -> Date? {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = regex.firstMatch(in: text, range: range),
              match.numberOfRanges >= 4
        else { return nil }

        func group(_ i: Int) -> Int? {
            guard let r = Range(match.range(at: i), in: text) else { return nil }
            return Int(text[r])
        }

        let cal = Calendar.current
        var comps = DateComponents()

        if pattern.hasPrefix(#"(\d{4})"#) {
            comps.year  = group(1)
            comps.month = group(2)
            comps.day   = group(3)
        } else {
            comps.day   = group(1)
            comps.month = group(2)
            comps.year  = group(3)
        }
        return cal.date(from: comps)
    }

    private func suggestCategory(from lowerText: String) -> String? {
        let rules: [(keywords: [String], category: String)] = [
            (["סופרמרקט", "שופרסל", "רמי לוי", "מגא", "ויקטורי", "supermarket", "groceries"], "groceries"),
            (["מסעדה", "אוכל", "קפה", "בית קפה", "restaurant", "cafe", "coffee"], "dining"),
            (["דלק", "פז", "סונול", "גז", "fuel", "petrol", "gas station"], "transport"),
            (["בית מרקחת", "אפוטיקה", "רופא", "pharmacy", "doctor", "hospital", "medical"], "health"),
            (["חשמל", "מים", "גז", "ארנונה", "electricity", "water", "utility"], "utilities"),
            (["בגד", "נעל", "אופנה", "clothes", "shoes", "fashion", "zara", "h&m"], "clothing"),
            (["קולנוע", "סרט", "בילוי", "cinema", "movie", "entertainment"], "entertainment"),
            (["בנק", "עמלה", "bank", "fee", "transfer"], "finance"),
        ]
        for rule in rules {
            if rule.keywords.contains(where: { lowerText.contains($0) }) {
                return rule.category
            }
        }
        return nil
    }
}

// MARK: - ImagePicker (UIViewControllerRepresentable)

struct ImagePicker: UIViewControllerRepresentable {

    enum SourceType { case camera, photoLibrary }

    let sourceType: SourceType
    let onImageSelected: (UIImage) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate     = context.coordinator
        picker.sourceType   = sourceType == .camera ? .camera : .photoLibrary
        picker.allowsEditing = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onImageSelected: onImageSelected) }

    class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let onImageSelected: (UIImage) -> Void
        init(onImageSelected: @escaping (UIImage) -> Void) { self.onImageSelected = onImageSelected }

        func imagePickerController(_ picker: UIImagePickerController,
                                   didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let img = info[.originalImage] as? UIImage { onImageSelected(img) }
            picker.dismiss(animated: true)
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            picker.dismiss(animated: true)
        }
    }
}

// MARK: - OCR Processing State

private enum ScannerPhase {
    case choosingSource
    case processing(UIImage)
    case confirming(UIImage, OCRService.ScanResult)
    case error(String)
}

// MARK: - ReceiptScannerView

struct ReceiptScannerView: View {

    let onConfirm: (OCRService.ScanResult) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var phase: ScannerPhase = .choosingSource
    @State private var showCamera = false
    @State private var showLibrary = false

    private let ocr = OCRService()

    var body: some View {
        NavigationStack {
            Group {
                switch phase {
                case .choosingSource:
                    sourceChooserView

                case .processing(let image):
                    OCRProcessingView(image: image)
                        .task { await processImage(image) }

                case .confirming(let image, let result):
                    ScannedReceiptConfirmationView(
                        image: image,
                        result: result
                    ) { finalResult in
                        onConfirm(finalResult)
                        dismiss()
                    } onCancel: {
                        dismiss()
                    }

                case .error(let message):
                    errorView(message: message)
                }
            }
            .navigationTitle("Сканировать чек")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                        .foregroundStyle(AppTheme.primaryBlue)
                }
            }
        }
        .sheet(isPresented: $showCamera) {
            ImagePicker(sourceType: .camera) { image in
                phase = .processing(image)
            }
        }
        .sheet(isPresented: $showLibrary) {
            ImagePicker(sourceType: .photoLibrary) { image in
                phase = .processing(image)
            }
        }
    }

    // MARK: - Source chooser

    private var sourceChooserView: some View {
        VStack(spacing: 24) {
            Image(systemName: "receipt")
                .font(.system(size: 72))
                .foregroundStyle(AppTheme.primaryBlue.opacity(0.5))
                .padding(.top, 40)

            Text("Выберите источник")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(AppTheme.textPrimary)

            Text("Сфотографируйте чек или выберите скриншот оплаты Apple Pay из галереи")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            VStack(spacing: 14) {
                Button {
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        showCamera = true
                    } else {
                        phase = .error("Камера недоступна на этом устройстве.")
                    }
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "camera.fill")
                            .font(.title3)
                        Text("Сфотографировать чек")
                            .fontWeight(.semibold)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())

                Button {
                    showLibrary = true
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "photo.on.rectangle")
                            .font(.title3)
                        Text("Выбрать из галереи")
                            .fontWeight(.semibold)
                    }
                }
                .buttonStyle(SecondaryButtonStyle())
            }
            .padding(.horizontal, 24)

            Spacer()
        }
        .background(AppTheme.backgroundLight.ignoresSafeArea())
    }

    // MARK: - Error view

    private func errorView(message: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 56))
                .foregroundStyle(AppTheme.warningOrange)
            Text("Ошибка")
                .font(.title2)
                .fontWeight(.bold)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button("Попробовать снова") {
                phase = .choosingSource
            }
            .buttonStyle(PrimaryButtonStyle())
            .padding(.horizontal, 40)
        }
    }

    // MARK: - OCR task

    private func processImage(_ image: UIImage) async {
        let result = await ocr.scanReceipt(image: image)
        await MainActor.run {
            phase = .confirming(image, result)
        }
    }
}

// MARK: - OCRProcessingView

struct OCRProcessingView: View {
    let image: UIImage

    var body: some View {
        VStack(spacing: 24) {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 260)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .shadow(color: .black.opacity(0.12), radius: 12, x: 0, y: 4)
                .padding(.horizontal, 24)
                .padding(.top, 32)

            VStack(spacing: 12) {
                ProgressView()
                    .scaleEffect(1.4)
                    .tint(AppTheme.primaryBlue)
                Text("Распознаём текст...")
                    .font(.headline)
                    .foregroundStyle(AppTheme.textPrimary)
                Text("Это займёт несколько секунд")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            Spacer()
        }
        .background(AppTheme.backgroundLight.ignoresSafeArea())
    }
}

// MARK: - ScannedReceiptConfirmationView

struct ScannedReceiptConfirmationView: View {

    let image: UIImage
    let result: OCRService.ScanResult
    let onConfirm: (OCRService.ScanResult) -> Void
    let onCancel: () -> Void

    @State private var amount:   String
    @State private var merchant: String
    @State private var date:     Date
    @State private var category: String

    init(
        image: UIImage,
        result: OCRService.ScanResult,
        onConfirm: @escaping (OCRService.ScanResult) -> Void,
        onCancel: @escaping () -> Void
    ) {
        self.image     = image
        self.result    = result
        self.onConfirm = onConfirm
        self.onCancel  = onCancel
        _amount   = State(initialValue: result.amount.map { String(format: "%.2f", $0) } ?? "")
        _merchant = State(initialValue: result.merchantName ?? "")
        _date     = State(initialValue: result.date ?? Date())
        _category = State(initialValue: result.suggestedCategoryKey ?? "")
    }

    private let allCategories = CategoryData.allCategories()

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Thumbnail
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 3)
                    .padding(.top, 16)

                // Editable fields
                VStack(spacing: 16) {
                    // Amount
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Сумма (₪)")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        TextField("0.00", text: $amount)
                            .font(.title2)
                            .fontWeight(.bold)
                            .keyboardType(.decimalPad)
                            .padding(12)
                            .background(AppTheme.backgroundLight)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }

                    // Merchant
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Название / Магазин")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        TextField("Введите название", text: $merchant)
                            .font(.subheadline)
                            .padding(12)
                            .background(AppTheme.backgroundLight)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }

                    // Date
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Дата")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        DatePicker("", selection: $date, displayedComponents: [.date])
                            .labelsHidden()
                            .environment(\.locale, Locale(identifier: "ru_RU"))
                            .tint(AppTheme.primaryBlue)
                    }

                    // Category chips
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Категория")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(allCategories) { cat in
                                    ChipView(
                                        title: cat.name,
                                        isSelected: category == cat.key,
                                        color: AppTheme.primaryBlue
                                    ) { category = cat.key }
                                }
                            }
                        }
                    }

                    // Raw OCR text disclosure
                    if !result.rawText.isEmpty {
                        DisclosureGroup("Исходный текст OCR") {
                            Text(result.rawText)
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.top, 4)
                        }
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                    }
                }
                .skrygaCard()
                .padding(.horizontal, 20)

                // Buttons
                VStack(spacing: 12) {
                    Button {
                        var updated = result
                        updated.amount            = Double(amount)
                        updated.merchantName      = merchant.isEmpty ? nil : merchant
                        updated.date              = date
                        updated.suggestedCategoryKey = category.isEmpty ? nil : category
                        onConfirm(updated)
                    } label: {
                        Text("Подтвердить и сохранить")
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(amount.isEmpty)

                    Button("Отмена", action: onCancel)
                        .buttonStyle(SecondaryButtonStyle())
                }
                .padding(.horizontal, 20)

                Spacer(minLength: 40)
            }
        }
        .background(AppTheme.backgroundLight.ignoresSafeArea())
    }
}

#Preview {
    ReceiptScannerView { _ in }
}
