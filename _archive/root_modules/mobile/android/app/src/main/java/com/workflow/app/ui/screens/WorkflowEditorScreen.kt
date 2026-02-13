/**
 * Workflow Editor Screen - Android Native
 * Touch-optimized workflow editing with Jetpack Compose
 */

package com.workflow.app.ui.screens

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.workflow.app.data.models.*
import com.workflow.app.ui.components.*
import com.workflow.app.viewmodels.WorkflowEditorViewModel
import kotlinx.coroutines.launch
import kotlin.math.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkflowEditorScreen(
    navController: NavController,
    workflowId: String? = null,
    viewModel: WorkflowEditorViewModel = hiltViewModel()
) {
    val haptics = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()
    
    var showNodePalette by remember { mutableStateOf(false) }
    var showNodeConfig by remember { mutableStateOf(false) }
    var selectedNode by remember { mutableStateOf<WorkflowNode?>(null) }
    
    val nodes by viewModel.nodes.collectAsState()
    val edges by viewModel.edges.collectAsState()
    val canvasState = rememberCanvasState()
    
    LaunchedEffect(workflowId) {
        workflowId?.let { viewModel.loadWorkflow(it) }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(viewModel.workflowName.value) },
                navigationIcon = {
                    IconButton(onClick = { navController.navigateUp() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        scope.launch {
                            viewModel.saveWorkflow()
                            navController.navigateUp()
                        }
                    }) {
                        Icon(Icons.Default.Save, contentDescription = "Save")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                    showNodePalette = true
                },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Node")
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Workflow Canvas
            WorkflowCanvas(
                nodes = nodes,
                edges = edges,
                canvasState = canvasState,
                onNodeClick = { node ->
                    haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    selectedNode = node
                },
                onNodeMove = { node, offset ->
                    viewModel.moveNode(node.id, offset)
                },
                onConnectionCreate = { sourceId, targetId ->
                    viewModel.createConnection(sourceId, targetId)
                }
            )
            
            // Zoom Controls
            Column(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(16.dp)
            ) {
                ZoomControls(
                    onZoomIn = { canvasState.zoomIn() },
                    onZoomOut = { canvasState.zoomOut() },
                    onReset = { canvasState.reset() }
                )
            }
            
            // Selected Node Actions
            selectedNode?.let { node ->
                NodeActionBar(
                    node = node,
                    onConfigure = {
                        showNodeConfig = true
                    },
                    onDuplicate = {
                        viewModel.duplicateNode(node)
                        selectedNode = null
                    },
                    onDelete = {
                        viewModel.deleteNode(node)
                        selectedNode = null
                    },
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp)
                )
            }
        }
    }
    
    // Node Palette Dialog
    if (showNodePalette) {
        NodePaletteDialog(
            onDismiss = { showNodePalette = false },
            onNodeSelected = { nodeType ->
                viewModel.addNode(nodeType)
                showNodePalette = false
            }
        )
    }
    
    // Node Configuration Dialog
    if (showNodeConfig && selectedNode != null) {
        NodeConfigDialog(
            node = selectedNode!!,
            onDismiss = { showNodeConfig = false },
            onSave = { updatedNode ->
                viewModel.updateNode(updatedNode)
                showNodeConfig = false
            }
        )
    }
}

@Composable
fun WorkflowCanvas(
    nodes: List<WorkflowNode>,
    edges: List<WorkflowEdge>,
    canvasState: CanvasState,
    onNodeClick: (WorkflowNode) -> Unit,
    onNodeMove: (WorkflowNode, Offset) -> Unit,
    onConnectionCreate: (String, String) -> Unit
) {
    val density = LocalDensity.current
    var connectionStart by remember { mutableStateOf<Pair<WorkflowNode, Offset>?>(null) }
    var connectionEnd by remember { mutableStateOf<Offset?>(null) }
    
    Canvas(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    canvasState.pan(pan)
                    canvasState.zoom(zoom)
                }
            }
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { offset ->
                        // Check if starting connection from a node output
                        val transformedOffset = canvasState.screenToCanvas(offset)
                        nodes.forEach { node ->
                            val nodeOutputPos = Offset(
                                node.position.x + 50,
                                node.position.y
                            )
                            if ((transformedOffset - nodeOutputPos).getDistance() < 20) {
                                connectionStart = node to nodeOutputPos
                            }
                        }
                    },
                    onDrag = { _, dragAmount ->
                        connectionStart?.let {
                            connectionEnd = connectionEnd?.plus(dragAmount) ?: dragAmount
                        }
                    },
                    onDragEnd = {
                        connectionStart?.let { (startNode, _) ->
                            connectionEnd?.let { endPos ->
                                // Check if ending on a node input
                                val transformedEnd = canvasState.screenToCanvas(endPos)
                                nodes.forEach { node ->
                                    if (node.id != startNode.id) {
                                        val nodeInputPos = Offset(
                                            node.position.x - 50,
                                            node.position.y
                                        )
                                        if ((transformedEnd - nodeInputPos).getDistance() < 20) {
                                            onConnectionCreate(startNode.id, node.id)
                                        }
                                    }
                                }
                            }
                        }
                        connectionStart = null
                        connectionEnd = null
                    }
                )
            }
    ) {
        // Apply canvas transformations
        drawIntoCanvas { canvas ->
            canvas.save()
            canvas.translate(canvasState.offset.x, canvasState.offset.y)
            canvas.scale(canvasState.scale, canvasState.scale)
            
            // Draw grid
            drawGrid()
            
            // Draw edges
            edges.forEach { edge ->
                val sourceNode = nodes.find { it.id == edge.sourceId }
                val targetNode = nodes.find { it.id == edge.targetId }
                if (sourceNode != null && targetNode != null) {
                    drawEdge(sourceNode, targetNode, edge)
                }
            }
            
            // Draw connection preview
            connectionStart?.let { (node, startPos) ->
                connectionEnd?.let { endPos ->
                    drawConnectionPreview(startPos, endPos)
                }
            }
            
            canvas.restore()
        }
    }
    
    // Draw nodes on top
    nodes.forEach { node ->
        WorkflowNodeView(
            node = node,
            canvasState = canvasState,
            onClick = { onNodeClick(node) },
            onMove = { offset -> onNodeMove(node, offset) }
        )
    }
}

@Composable
fun WorkflowNodeView(
    node: WorkflowNode,
    canvasState: CanvasState,
    onClick: () -> Unit,
    onMove: (Offset) -> Unit
) {
    val haptics = LocalHapticFeedback.current
    var isDragging by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isDragging) 1.1f else 1.0f,
        animationSpec = spring()
    )
    
    Box(
        modifier = Modifier
            .offset(
                x = (node.position.x * canvasState.scale + canvasState.offset.x).dp,
                y = (node.position.y * canvasState.scale + canvasState.offset.y).dp
            )
            .size(100.dp * canvasState.scale)
            .scale(scale)
            .zIndex(if (isDragging) 1f else 0f)
            .pointerInput(node.id) {
                detectDragGestures(
                    onDragStart = {
                        isDragging = true
                        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                    },
                    onDragEnd = {
                        isDragging = false
                        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    },
                    onDrag = { _, dragAmount ->
                        val scaledAmount = Offset(
                            dragAmount.x / canvasState.scale,
                            dragAmount.y / canvasState.scale
                        )
                        onMove(node.position + scaledAmount)
                    }
                )
            }
            .clickable { onClick() }
    ) {
        // Node Background
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(12.dp)),
            color = Color(node.color),
            shadowElevation = if (isDragging) 8.dp else 4.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = getNodeIcon(node.type),
                    contentDescription = node.name,
                    modifier = Modifier.size(24.dp),
                    tint = Color.White
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = node.name,
                    color = Color.White,
                    fontSize = 10.sp,
                    maxLines = 2
                )
            }
        }
        
        // Connection Points
        // Input
        Box(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .offset(x = (-6).dp)
                .size(12.dp)
                .clip(CircleShape)
                .background(Color.Gray)
                .border(2.dp, Color.White, CircleShape)
        )
        
        // Output
        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .offset(x = 6.dp)
                .size(12.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary)
                .border(2.dp, Color.White, CircleShape)
        )
    }
}

@Composable
fun NodeActionBar(
    node: WorkflowNode,
    onConfigure: () -> Unit,
    onDuplicate: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.animateContentSize(),
        shape = RoundedCornerShape(16.dp),
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ActionButton(
                icon = Icons.Default.Settings,
                text = "Configure",
                onClick = onConfigure
            )
            ActionButton(
                icon = Icons.Default.ContentCopy,
                text = "Duplicate",
                onClick = onDuplicate
            )
            ActionButton(
                icon = Icons.Default.Delete,
                text = "Delete",
                onClick = onDelete,
                contentColor = MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
fun ActionButton(
    icon: ImageVector,
    text: String,
    onClick: () -> Unit,
    contentColor: Color = MaterialTheme.colorScheme.primary
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(8.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = text,
            tint = contentColor,
            modifier = Modifier.size(24.dp)
        )
        Text(
            text = text,
            color = contentColor,
            fontSize = 12.sp
        )
    }
}

// Extension functions
fun DrawScope.drawGrid() {
    val gridSize = 20.dp.toPx()
    val canvasWidth = size.width
    val canvasHeight = size.height
    
    // Draw vertical lines
    var x = 0f
    while (x < canvasWidth) {
        drawLine(
            color = Color.Gray.copy(alpha = 0.1f),
            start = Offset(x, 0f),
            end = Offset(x, canvasHeight),
            strokeWidth = 1.dp.toPx()
        )
        x += gridSize
    }
    
    // Draw horizontal lines
    var y = 0f
    while (y < canvasHeight) {
        drawLine(
            color = Color.Gray.copy(alpha = 0.1f),
            start = Offset(0f, y),
            end = Offset(canvasWidth, y),
            strokeWidth = 1.dp.toPx()
        )
        y += gridSize
    }
}

fun DrawScope.drawEdge(
    sourceNode: WorkflowNode,
    targetNode: WorkflowNode,
    edge: WorkflowEdge
) {
    val sourcePos = Offset(sourceNode.position.x + 50, sourceNode.position.y)
    val targetPos = Offset(targetNode.position.x - 50, targetNode.position.y)
    
    val path = Path().apply {
        moveTo(sourcePos.x, sourcePos.y)
        cubicTo(
            sourcePos.x + 100, sourcePos.y,
            targetPos.x - 100, targetPos.y,
            targetPos.x, targetPos.y
        )
    }
    
    drawPath(
        path = path,
        color = Color.Gray,
        style = Stroke(width = 2.dp.toPx())
    )
}