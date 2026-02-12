import SwiftUI

struct ContentView: View {
    @AppStorage("apiUrl") private var apiUrl: String = "http://localhost:3000"
    @AppStorage("apiToken") private var apiToken: String = ""
    @State private var showSaved = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("📚 Wikipedia Reading Tracker")
                            .font(.headline)
                        Text("This extension automatically tracks Wikipedia articles you read in Safari and logs them to your profile.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }

                Section("Enable the Extension") {
                    VStack(alignment: .leading, spacing: 6) {
                        Label("Open **Settings**", systemImage: "1.circle.fill")
                        Label("Go to **Safari → Extensions**", systemImage: "2.circle.fill")
                        Label("Enable **Wiki Tracker**", systemImage: "3.circle.fill")
                        Label("Allow for **All Websites** or wikipedia.org", systemImage: "4.circle.fill")
                    }
                    .font(.subheadline)
                    .padding(.vertical, 4)
                }

                Section("API Configuration") {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("API URL")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextField("http://localhost:3000", text: $apiUrl)
                            .textContentType(.URL)
                            .keyboardType(.URL)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("API Token")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        SecureField("Paste your API token", text: $apiToken)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                    }
                }

                Section {
                    Button(action: saveSettings) {
                        HStack {
                            Spacer()
                            Text("Save Settings")
                                .fontWeight(.medium)
                            Spacer()
                        }
                    }
                }

                if showSaved {
                    Section {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                            Text("Settings saved! The extension will use these values.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Wiki Tracker")
        }
    }

    private func saveSettings() {
        // @AppStorage automatically persists to UserDefaults.
        // The extension reads settings via browser.storage.local (configured in popup).
        // This host app provides a convenient way to see setup instructions.
        withAnimation {
            showSaved = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            withAnimation {
                showSaved = false
            }
        }
    }
}

#Preview {
    ContentView()
}

