from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging
from typing import List
from main import app as agent_app, ask

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent-server")

app = FastAPI(title="ResilienceAI Agent Server")

class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default"

class ChatResponse(BaseModel):
    response: str
    trace: List[str] = []

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    logger.info(f"Received question: {req.message} (thread: {req.thread_id})")
    try:
        # Use stream to capture the trace
        # The graph state has 'messages', but we care about which nodes ran.
        trace = []
        final_answer = ""
        
        # We need to construct the input exactly like main.ask does
        inputs = {"messages": [{"role": "user", "content": req.message}]}
        config = {"configurable": {"thread_id": req.thread_id}}
        
        # Stream events
        # app.stream returns output from each node: {node_name: state_update}
        print(f"[DEBUG] Starting stream for thread {req.thread_id}...")
        for event in agent_app.stream(inputs, config=config):
            print(f"[DEBUG] Event received: {event.keys()}")
            for node_name, state_update in event.items():
                trace.append(node_name)
                # Check for final answer in the messages if this is the last step
                if "messages" in state_update:
                    messages = state_update["messages"]
                    if messages:
                        last_msg = messages[-1]
                        # Extract text content
                        content = ""
                        if isinstance(last_msg, dict):
                            content = last_msg.get("content") or ""
                        else:
                            content = getattr(last_msg, "content", "")
                        
                        if content and node_name != "supervisor":
                             final_answer = content

        if not trace:
            print("[WARN] Trace is empty! Stream might not have yielded events.")
        else:
            print(f"[INFO] Captured trace: {trace}")

        # If final_answer is empty, try to get it from the final state like ask() does
        if not final_answer:
            # Fallback to the logic in main.ask if streaming didn't catch it easily
            # But we can't call ask() again easily without re-running.
            # Let's hope the last agent's message is the answer.
            # Or we can just inspect the last state? 
            # app.stream yields ONE dict per node step.
            pass
            
        # Re-verify final answer logic using the state snapshot if needed?
        # Actually, let's use the 'ask' logic helper to extract the answer from the FINAL state
        # app.get_state(config).values['messages']
        final_state = agent_app.get_state(config)
        messages = final_state.values.get("messages", [])
        
        # Extract answer logic from main.ask (simplified)
        for msg in reversed(messages):
            if (getattr(msg, "role", "") == "assistant" or getattr(msg, "type", "") == "ai"):
                content = getattr(msg, "content", "")
                if content and content.strip().lower() != req.message.strip().lower():
                    final_answer = content
                    break
        
        if not final_answer:
            final_answer = "No response from agents."

        return ChatResponse(response=final_answer, trace=trace)
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("\n[INFO] Starting Agent Server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
