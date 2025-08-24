import { NextRequest, NextResponse } from 'next/server';

interface ExecutePythonRequest {
  code: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExecutePythonRequest = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Python code is required.' },
        { status: 400 }
      );
    }

    console.log(`[PYTHON] Executing Python code (${code.length} characters)`);
    console.log(`[PYTHON] Code preview:`, code.substring(0, 200) + '...');

    // Simple method for Python code execution
    // In production, Docker or separate Python environment would be needed
    // Here we use child_process from Node.js to execute Python
    
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      // Try to find python3 in the PATH, fallback to common locations
      const pythonCommand = 'python3';
      const pythonProcess = spawn(pythonCommand, ['-c', code], {
        env: { 
          ...process.env, 
          PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:' + process.env.PATH 
        }
      });
      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data: Buffer) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        error += data.toString();
      });

      pythonProcess.on('close', (exitCode: number) => {
        console.log(`[PYTHON] Process exited with code: ${exitCode}`);
        console.log(`[PYTHON] STDOUT:`, result);
        console.log(`[PYTHON] STDERR:`, error);
        
        if (exitCode === 0 && result.trim()) {
          // Python script outputs base64 image
          resolve(NextResponse.json({
            success: true,
            image: result.trim(),
            message: 'Visualization generated successfully.'
          }));
        } else {
          const errorMsg = error || 'Error occurred during code execution.';
          console.error(`[PYTHON] Execution failed:`, errorMsg);
          resolve(NextResponse.json({
            success: false,
            error: errorMsg,
            exitCode: exitCode,
            message: 'Python code execution failed.'
          }, { status: 500 }));
        }
      });

      // Timeout setting (30 seconds)
      setTimeout(() => {
        pythonProcess.kill();
        resolve(NextResponse.json({
          success: false,
          error: 'Execution timeout',
          message: 'Python code execution timed out.'
        }, { status: 408 }));
      }, 30000);
    });

  } catch (error) {
    console.error('[PYTHON] API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error occurred during Python code execution.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
