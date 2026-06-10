// SkrygaApp.swift
// Skryga — Main app entry point with SwiftData + CloudKit setup

import SwiftUI
import SwiftData
import CloudKit
import UserNotifications

@main
struct SkrygaApp: App {

    // MARK: - Model Container

    let modelContainer: ModelContainer

    // MARK: - Initializer

    init() {
        modelContainer = Self.makeModelContainer()
        requestNotificationPermissions()
    }

    // MARK: - Body

    var body: some Scene {
        WindowGroup {
            ContentView()
                .modelContainer(modelContainer)
                .onAppear {
                    seedDefaultDataIfNeeded()
                }
        }
    }

    // MARK: - Container Factory

    private static func makeModelContainer() -> ModelContainer {
        let schema = Schema([
            Transaction.self,
            SavingsGoal.self,
            PensionFund.self,
            Budget.self,
            FamilyMember.self
        ])

        // Attempt CloudKit-backed store first
        do {
            let cloudKitConfig = ModelConfiguration(
                schema: schema,
                isStoredInMemoryOnly: false,
                cloudKitDatabase: .private("iCloud.com.skryga.app")
            )
            return try ModelContainer(for: schema, configurations: [cloudKitConfig])
        } catch {
            print("⚠️ CloudKit store unavailable, falling back to local store: \(error.localizedDescription)")
        }

        // Fallback: local-only store
        do {
            let localConfig = ModelConfiguration(
                schema: schema,
                isStoredInMemoryOnly: false
            )
            return try ModelContainer(for: schema, configurations: [localConfig])
        } catch {
            fatalError("❌ Failed to initialize ModelContainer: \(error.localizedDescription)")
        }
    }

    // MARK: - Notifications

    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { granted, error in
            if let error {
                print("Notification permission error: \(error.localizedDescription)")
            } else {
                print("Notification permission granted: \(granted)")
            }
        }
    }

    // MARK: - Default Data Seeding

    /// Seeds two default family members on the very first launch.
    private func seedDefaultDataIfNeeded() {
        let context = modelContainer.mainContext
        let descriptor = FetchDescriptor<FamilyMember>()

        do {
            let existing = try context.fetch(descriptor)
            guard existing.isEmpty else { return }

            let husband = FamilyMember(
                name: "Муж",
                role: "husband",
                emoji: "👨",
                colorHex: "#2D6CDF"
            )
            let wife = FamilyMember(
                name: "Жена",
                role: "wife",
                emoji: "👩",
                colorHex: "#7B5CF0"
            )

            context.insert(husband)
            context.insert(wife)
            try context.save()
            print("✅ Seeded default family members.")
        } catch {
            print("Failed to seed default data: \(error.localizedDescription)")
        }
    }
}
