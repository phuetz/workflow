/**
 * Workflow iOS App - Main Content View
 * Native iOS application for workflow automation
 */

import SwiftUI

struct ContentView: View {
    @StateObject private var authManager = AuthenticationManager.shared
    @StateObject private var workflowStore = WorkflowStore.shared
    @State private var selectedTab = 0
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                TabView(selection: $selectedTab) {
                    DashboardView()
                        .tabItem {
                            Label("Dashboard", systemImage: "chart.bar.fill")
                        }
                        .tag(0)
                    
                    WorkflowListView()
                        .tabItem {
                            Label("Workflows", systemImage: "flowchart.fill")
                        }
                        .tag(1)
                        .badge(workflowStore.activeWorkflowsCount)
                    
                    ExecutionsView()
                        .tabItem {
                            Label("Executions", systemImage: "play.circle.fill")
                        }
                        .tag(2)
                    
                    NotificationsView()
                        .tabItem {
                            Label("Alerts", systemImage: "bell.fill")
                        }
                        .tag(3)
                        .badge(workflowStore.unreadNotificationsCount)
                    
                    ProfileView()
                        .tabItem {
                            Label("Profile", systemImage: "person.circle.fill")
                        }
                        .tag(4)
                }
                .accentColor(.blue)
                .onAppear {
                    setupNotifications()
                    workflowStore.startRealtimeUpdates()
                }
            } else {
                LoginView()
            }
        }
        .preferredColorScheme(authManager.userPreferences.darkMode ? .dark : .light)
    }
    
    private func setupNotifications() {
        NotificationManager.shared.requestAuthorization { granted in
            if granted {
                print("Notifications authorized")
            }
        }
    }
}

// MARK: - Dashboard View
struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var showingCreateWorkflow = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header Card
                    HeaderCardView(viewModel: viewModel)
                    
                    // Quick Stats
                    StatsGridView(stats: viewModel.stats)
                    
                    // Quick Actions
                    QuickActionsView(
                        onCreateWorkflow: { showingCreateWorkflow = true },
                        onImportWorkflow: viewModel.importWorkflow,
                        onViewTemplates: viewModel.showTemplates
                    )
                    
                    // Execution Chart
                    if !viewModel.executionHistory.isEmpty {
                        ExecutionChartView(data: viewModel.executionHistory)
                            .frame(height: 200)
                            .padding(.horizontal)
                    }
                    
                    // Recent Workflows
                    RecentWorkflowsView(workflows: viewModel.recentWorkflows)
                    
                    // System Status
                    SystemStatusView(status: viewModel.systemStatus)
                }
                .padding(.bottom, 20)
            }
            .navigationTitle("Dashboard")
            .refreshable {
                await viewModel.refresh()
            }
            .sheet(isPresented: $showingCreateWorkflow) {
                WorkflowEditorView(workflow: nil)
            }
        }
    }
}

// MARK: - Header Card View
struct HeaderCardView: View {
    @ObservedObject var viewModel: DashboardViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Good \(timeOfDay),")
                .font(.headline)
                .foregroundColor(.secondary)
            
            Text(viewModel.userName)
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("You have \(viewModel.activeWorkflowsCount) active workflows")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(
            LinearGradient(
                gradient: Gradient(colors: [.blue, .blue.opacity(0.8)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .foregroundColor(.white)
        .cornerRadius(16)
        .padding(.horizontal)
        .shadow(radius: 5)
    }
    
    private var timeOfDay: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12: return "Morning"
        case 12..<17: return "Afternoon"
        default: return "Evening"
        }
    }
}

// MARK: - Stats Grid View
struct StatsGridView: View {
    let stats: [DashboardStat]
    
    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
            ForEach(stats) { stat in
                StatCardView(stat: stat)
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Stat Card View
struct StatCardView: View {
    let stat: DashboardStat
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: stat.icon)
                    .font(.title2)
                    .foregroundColor(stat.color)
                Spacer()
                if stat.trend != 0 {
                    TrendIndicator(value: stat.trend)
                }
            }
            
            Text(stat.value)
                .font(.title)
                .fontWeight(.bold)
            
            Text(stat.title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

// MARK: - Trend Indicator
struct TrendIndicator: View {
    let value: Double
    
    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: value > 0 ? "arrow.up.right" : "arrow.down.right")
                .font(.caption)
            Text("\(abs(value), specifier: "%.1f")%")
                .font(.caption)
                .fontWeight(.medium)
        }
        .foregroundColor(value > 0 ? .green : .red)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(value > 0 ? Color.green.opacity(0.1) : Color.red.opacity(0.1))
        )
    }
}

// MARK: - Quick Actions View
struct QuickActionsView: View {
    let onCreateWorkflow: () -> Void
    let onImportWorkflow: () -> Void
    let onViewTemplates: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    QuickActionButton(
                        title: "Create",
                        icon: "plus.circle.fill",
                        color: .blue,
                        action: onCreateWorkflow
                    )
                    
                    QuickActionButton(
                        title: "Import",
                        icon: "square.and.arrow.down",
                        color: .green,
                        action: onImportWorkflow
                    )
                    
                    QuickActionButton(
                        title: "Templates",
                        icon: "doc.text",
                        color: .orange,
                        action: onViewTemplates
                    )
                    
                    QuickActionButton(
                        title: "Schedule",
                        icon: "calendar",
                        color: .purple,
                        action: {}
                    )
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Quick Action Button
struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            withAnimation {
                action()
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
        }) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(.white)
                    .frame(width: 50, height: 50)
                    .background(color)
                    .cornerRadius(12)
                
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}