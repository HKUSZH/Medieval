import json
import time
import requests
from tqdm import tqdm

# Configuration
#API_URL = "http://127.0.0.1:11434/api/generate"
API_URL = "http://localhost:11434/api/generate"

MODEL = "deepseek-r1:70b"
BATCH_SIZE = 5

def read_questions(file_path):
    """Read questions from JSON file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def query_model(prompt):
    """Send prompt to Ollama model and return response"""
    # First test basic API connectivity
    try:
        health_response = requests.get("http://127.0.0.1:11434")
        print(f"\nHealth Check Status: {health_response.status_code}")
        print(f"Health Check Response: {health_response.text}")
    except Exception as e:
        print(f"\nHealth Check Failed: {e}")
        return None

    payload = {
        "model": MODEL,
        "prompt": str(prompt),  # Ensure prompt is a string
        "stream": False
    }
    
    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            response = requests.post(API_URL, json=payload)
            
            # Print detailed response info for debugging
            print(f"\nAttempt {attempt + 1}:")
            print(f"Request URL: {API_URL}")
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {response.headers}")
            
            response.raise_for_status()
            return response.json()['response']
            
        except requests.exceptions.HTTPError as e:
            print(f"\nHTTP Error: {e}")
            print(f"Response Text: {response.text}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                print("Max retries reached. Giving up.")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"\nRequest Exception: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                print("Max retries reached. Giving up.")
                return None

def process_questions(questions, output_file):
    """Process all questions and store responses"""
    results = []
    batch_number = 1
    
    for i, question in enumerate(tqdm(questions, desc="Processing questions")):
        qID = question["QID"]
        qText = question["text"]
        print(f"MODEL=[{MODEL}]\tquestion [{i}]\t[{time.strftime('%Y-%m-%d %H:%M:%S')}]\tQID=[{qID}]")
        print(f"question preview: {qText[:100]}...")
        response = query_model(qText)
        if response:
            results.append({
                "question": question,
                "response": response
            })
            print(f"Response preview: {response[:100]}...")
            
            # Save after each response
            with open(output_file, 'a', encoding="utf-8") as f:
                json.dump({
                    "question": question,
                    "response": response
                }, f, ensure_ascii=False)
                f.write("\n")
            
            # Save batch every 50 responses
            if (i + 1) % BATCH_SIZE == 0:
                save_incremental_results(results, output_file, batch_number)
                batch_number += 1
                # results = []  # Reset for next batch
    
    # Save any remaining results
    if results:
        save_incremental_results(results, output_file, batch_number)
    
    return results

def save_incremental_results(results, output_file, batch_number):
    """Save results to intermediate JSON file"""
    batch_file = f"{output_file.split('.')[0]}_batch_{batch_number}.json"
    with open(batch_file, 'w', encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved intermediate results to {batch_file}")

def save_results(results, output_file):
    """Save results to final JSON file"""
    with open(output_file, 'w', encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved final results to {output_file}")

def main():
    input_file = "question_675_shuffled.json"
    output_file = "responses_dsr1_70b.json"
    
    
    print("Reading questions...")
    questions = read_questions(input_file)
    
    print("Processing questions...")
    # Clear output file before starting
    open(output_file, 'w').close()
    results = process_questions(questions, output_file)
    
    print("Saving results...")
    save_results(results, output_file)
    
    print(f"Completed! Results saved to {output_file}")

if __name__ == "__main__":
    main()
