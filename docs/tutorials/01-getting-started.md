# Tutorial 1: Getting Started with Workflow

**Duration:** 5 minutes
**Level:** Beginner
**Prerequisites:** None

## Learning Objectives

By the end of this tutorial, you will:
- Understand what Workflow is and what it can do
- Navigate the main interface
- Create your first workflow
- Execute a simple workflow

---

## Script

### [00:00-00:30] Introduction

**Narrator:** "Welcome to Workflow! In this 5-minute tutorial, we'll get you started with the basics of workflow automation. Workflow is a visual automation platform that lets you connect different apps and services without writing code. Think of it as a Swiss Army knife for automating repetitive tasks."

**[Screen: Workflow logo animation]**

---

### [00:30-01:15] Interface Overview

**Narrator:** "Let's start with a quick tour of the interface. When you first log in, you'll see the Dashboard on the left sidebar. This shows all your workflows, recent executions, and quick stats."

**[Screen recording: Dashboard view with hover highlights]**

**Narrator:** "The main area is your canvas - this is where you'll build your workflows by dragging and dropping nodes. On the right, you'll see the node library with over 400 integrations organized by category."

**[Screen: Highlight sidebar, canvas, node library]**

**Narrator:** "At the top, you have your workflow controls: Save, Execute, and Settings. Pretty straightforward!"

**[Screen: Highlight top toolbar]**

---

### [01:15-02:30] Creating Your First Workflow

**Narrator:** "Let's create your first workflow! Click the 'New Workflow' button in the top left."

**[Screen recording: Click New Workflow button]**

**Narrator:** "Every workflow starts with a trigger - something that kicks off the automation. For this example, we'll use a manual trigger, which means you can run the workflow whenever you want with a button click."

**[Screen recording: Drag 'Manual Trigger' node from sidebar to canvas]**

**Narrator:** "Great! Now let's add an action. I'll search for 'HTTP Request' in the node library."

**[Screen recording: Type 'HTTP' in search, drag HTTP Request node]**

**Narrator:** "Connect the trigger to the HTTP Request node by dragging from the small circle on the right of the trigger to the HTTP Request node."

**[Screen recording: Draw connection between nodes with animated line]**

---

### [02:30-03:45] Configuring Nodes

**Narrator:** "Now let's configure the HTTP Request. Click on the node to open its configuration panel on the right."

**[Screen recording: Click HTTP Request node, panel slides in from right]**

**Narrator:** "We'll make a simple request to get some sample data. Set the method to GET and enter this URL: https://jsonplaceholder.typicode.com/users/1"

**[Screen recording: 
- Select GET from dropdown
- Type URL into field
- Show URL appearing in config]**

**Narrator:** "That's it! This will fetch user data from a free API. You can see a preview of what the response will look like."

**[Screen: Show JSON response preview]**

---

### [03:45-04:30] Executing Your Workflow

**Narrator:** "Time to see it in action! Click the Execute button at the top."

**[Screen recording: Click Execute button, animation starts]**

**Narrator:** "Watch as the workflow executes. You'll see each node light up green as it completes successfully."

**[Screen: Nodes animate with green check marks, data flowing between nodes]**

**Narrator:** "And there we go! Click on the HTTP Request node to see the actual data that was returned."

**[Screen recording: Click node, show execution results in side panel with formatted JSON]**

---

### [04:30-05:00] Wrap-up

**Narrator:** "Congratulations! You've just created and executed your first workflow. This is just the beginning - you can chain together hundreds of different services, add conditional logic, transform data, and much more."

**[Screen: Show quick montage of complex workflows]**

**Narrator:** "In the next tutorial, we'll build a more practical workflow that sends you an email notification. Don't forget to save your workflow by clicking the Save button. Happy automating!"

**[Screen: Workflow saved confirmation, fade to end screen with "Next: Creating Your First Workflow"]**

---

## Key Takeaways

- Workflow is a visual automation platform
- Every workflow starts with a trigger
- Nodes are connected by dragging lines between them
- Click nodes to configure them
- Execute button runs your workflow
- Green = success, Red = error

## Next Steps

- Try adding more nodes to your workflow
- Explore different trigger types (Schedule, Webhook)
- Watch "Creating Your First Workflow" tutorial

---

## Additional Resources

- Documentation: https://docs.workflow.com
- Community Forum: https://community.workflow.com
- Node Library: https://docs.workflow.com/nodes

