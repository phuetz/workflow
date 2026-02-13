/**
 * Workflow Editor View - iOS Native
 * Touch-optimized workflow editing with gesture support
 */

import SwiftUI
import Combine

struct WorkflowEditorView: View {
    @StateObject private var viewModel: WorkflowEditorViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showingNodePalette = false
    @State private var showingNodeConfig = false
    @State private var selectedNode: WorkflowNode?
    @State private var canvasOffset = CGSize.zero
    @State private var canvasScale: CGFloat = 1.0
    @State private var showingSaveAlert = false
    
    init(workflow: Workflow?) {
        _viewModel = StateObject(wrappedValue: WorkflowEditorViewModel(workflow: workflow))
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                // Canvas Background
                Color(.systemGray6)
                    .edgesIgnoringSafeArea(.all)
                
                // Workflow Canvas
                WorkflowCanvasView(
                    nodes: $viewModel.nodes,
                    edges: $viewModel.edges,
                    selectedNode: $selectedNode,
                    offset: $canvasOffset,
                    scale: $canvasScale,
                    onNodeTapped: handleNodeTap,
                    onNodeMoved: viewModel.moveNode,
                    onConnectionCreated: viewModel.createConnection
                )
                
                // Floating Action Buttons
                VStack {
                    HStack {
                        // Zoom Controls
                        VStack(spacing: 0) {
                            Button(action: zoomIn) {
                                Image(systemName: "plus.magnifyingglass")
                                    .font(.title2)
                                    .frame(width: 44, height: 44)
                            }
                            
                            Divider()
                            
                            Button(action: zoomOut) {
                                Image(systemName: "minus.magnifyingglass")
                                    .font(.title2)
                                    .frame(width: 44, height: 44)
                            }
                            
                            Divider()
                            
                            Button(action: resetZoom) {
                                Image(systemName: "1.magnifyingglass")
                                    .font(.title2)
                                    .frame(width: 44, height: 44)
                            }
                        }
                        .background(Color(.systemBackground))
                        .cornerRadius(8)
                        .shadow(radius: 3)
                        
                        Spacer()
                    }
                    
                    Spacer()
                    
                    // Bottom Action Bar
                    if let node = selectedNode {
                        NodeActionBar(
                            node: node,
                            onConfigure: { showingNodeConfig = true },
                            onDuplicate: { viewModel.duplicateNode(node) },
                            onDelete: { viewModel.deleteNode(node) }
                        )
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .padding()
                
                // Add Node Button
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button(action: { showingNodePalette = true }) {
                            Image(systemName: "plus")
                                .font(.title)
                                .foregroundColor(.white)
                                .frame(width: 56, height: 56)
                                .background(Color.blue)
                                .cornerRadius(28)
                                .shadow(radius: 5)
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle(viewModel.workflowName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        if viewModel.hasUnsavedChanges {
                            showingSaveAlert = true
                        } else {
                            dismiss()
                        }
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        Task {
                            await viewModel.saveWorkflow()
                            dismiss()
                        }
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .sheet(isPresented: $showingNodePalette) {
            NodePaletteView { nodeType in
                viewModel.addNode(type: nodeType)
            }
        }
        .sheet(item: $selectedNode) { node in
            NodeConfigurationView(node: node) { updatedNode in
                viewModel.updateNode(updatedNode)
            }
        }
        .alert("Unsaved Changes", isPresented: $showingSaveAlert) {
            Button("Save & Exit") {
                Task {
                    await viewModel.saveWorkflow()
                    dismiss()
                }
            }
            Button("Discard", role: .destructive) {
                dismiss()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("You have unsaved changes. What would you like to do?")
        }
    }
    
    // MARK: - Actions
    
    private func handleNodeTap(_ node: WorkflowNode) {
        withAnimation(.spring()) {
            selectedNode = node
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
    
    private func zoomIn() {
        withAnimation {
            canvasScale = min(canvasScale * 1.2, 3.0)
        }
    }
    
    private func zoomOut() {
        withAnimation {
            canvasScale = max(canvasScale / 1.2, 0.5)
        }
    }
    
    private func resetZoom() {
        withAnimation {
            canvasScale = 1.0
            canvasOffset = .zero
        }
    }
}

// MARK: - Workflow Canvas View
struct WorkflowCanvasView: View {
    @Binding var nodes: [WorkflowNode]
    @Binding var edges: [WorkflowEdge]
    @Binding var selectedNode: WorkflowNode?
    @Binding var offset: CGSize
    @Binding var scale: CGFloat
    
    let onNodeTapped: (WorkflowNode) -> Void
    let onNodeMoved: (WorkflowNode, CGPoint) -> Void
    let onConnectionCreated: (String, String) -> Void
    
    @GestureState private var dragOffset = CGSize.zero
    @State private var connectionStart: WorkflowNode?
    @State private var connectionEnd: CGPoint?
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Grid Background
                GridBackgroundView()
                
                // Edges
                ForEach(edges) { edge in
                    EdgeView(
                        edge: edge,
                        nodes: nodes,
                        scale: scale,
                        offset: offset
                    )
                }
                
                // Connection Preview
                if let startNode = connectionStart, let endPoint = connectionEnd {
                    ConnectionPreviewView(
                        startNode: startNode,
                        endPoint: endPoint,
                        scale: scale,
                        offset: offset
                    )
                }
                
                // Nodes
                ForEach(nodes) { node in
                    NodeView(
                        node: node,
                        isSelected: selectedNode?.id == node.id,
                        scale: scale,
                        offset: offset,
                        onTap: { onNodeTapped(node) },
                        onDragEnded: { location in
                            onNodeMoved(node, location)
                        },
                        onConnectionStart: { connectionStart = node },
                        onConnectionEnd: { targetNode in
                            if let startNode = connectionStart {
                                onConnectionCreated(startNode.id, targetNode.id)
                            }
                            connectionStart = nil
                            connectionEnd = nil
                        }
                    )
                }
            }
            .scaleEffect(scale)
            .offset(x: offset.width + dragOffset.width, y: offset.height + dragOffset.height)
            .gesture(
                DragGesture()
                    .updating($dragOffset) { value, state, _ in
                        state = value.translation
                    }
                    .onEnded { value in
                        offset = CGSize(
                            width: offset.width + value.translation.width,
                            height: offset.height + value.translation.height
                        )
                    }
            )
            .gesture(
                MagnificationGesture()
                    .onChanged { value in
                        scale = min(max(value, 0.5), 3.0)
                    }
            )
            .onTapGesture {
                withAnimation {
                    selectedNode = nil
                }
            }
        }
    }
}

// MARK: - Node View
struct NodeView: View {
    let node: WorkflowNode
    let isSelected: Bool
    let scale: CGFloat
    let offset: CGSize
    let onTap: () -> Void
    let onDragEnded: (CGPoint) -> Void
    let onConnectionStart: () -> Void
    let onConnectionEnd: (WorkflowNode) -> Void
    
    @State private var isDragging = false
    @GestureState private var dragOffset = CGSize.zero
    
    var body: some View {
        VStack(spacing: 0) {
            // Connection Points
            HStack {
                // Input
                Circle()
                    .fill(Color.gray)
                    .frame(width: 12, height: 12)
                    .offset(x: -6)
                    .onTapGesture {
                        onConnectionEnd(node)
                    }
                
                Spacer()
                
                // Output
                Circle()
                    .fill(Color.blue)
                    .frame(width: 12, height: 12)
                    .offset(x: 6)
                    .gesture(
                        DragGesture()
                            .onChanged { _ in
                                onConnectionStart()
                            }
                    )
            }
            .frame(width: 120)
            
            // Node Body
            VStack(spacing: 4) {
                Image(systemName: node.icon)
                    .font(.title2)
                    .foregroundColor(.white)
                
                Text(node.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }
            .frame(width: 100, height: 70)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(hex: node.color))
                    .shadow(color: isSelected ? Color.blue : Color.black.opacity(0.2),
                           radius: isSelected ? 8 : 3)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 3)
            )
        }
        .position(
            x: (node.position.x + offset.width / scale) * scale + dragOffset.width,
            y: (node.position.y + offset.height / scale) * scale + dragOffset.height
        )
        .scaleEffect(isDragging ? 1.1 : 1.0)
        .animation(.spring(), value: isDragging)
        .onTapGesture {
            onTap()
        }
        .gesture(
            DragGesture()
                .updating($dragOffset) { value, state, _ in
                    state = value.translation
                }
                .onChanged { _ in
                    isDragging = true
                }
                .onEnded { value in
                    isDragging = false
                    let newPosition = CGPoint(
                        x: node.position.x + value.translation.width / scale,
                        y: node.position.y + value.translation.height / scale
                    )
                    onDragEnded(newPosition)
                }
        )
    }
}

// MARK: - Node Action Bar
struct NodeActionBar: View {
    let node: WorkflowNode
    let onConfigure: () -> Void
    let onDuplicate: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        HStack(spacing: 20) {
            ActionButton(
                icon: "gearshape",
                title: "Configure",
                color: .blue,
                action: onConfigure
            )
            
            ActionButton(
                icon: "doc.on.doc",
                title: "Duplicate",
                color: .green,
                action: onDuplicate
            )
            
            ActionButton(
                icon: "trash",
                title: "Delete",
                color: .red,
                action: onDelete
            )
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(radius: 8)
        )
    }
}

// MARK: - Action Button
struct ActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            action()
        }) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.title2)
                Text(title)
                    .font(.caption)
            }
            .foregroundColor(color)
            .frame(width: 80, height: 60)
        }
    }
}