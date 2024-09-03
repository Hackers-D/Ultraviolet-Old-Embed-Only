class ErrorHandler {
    constructor(maxErrors = 10, clearInterval = 60000) {
      this.errors = [];
      this.maxErrors = maxErrors;
      this.clearInterval = clearInterval;
      this.lastClearTime = Date.now();
    }
  
    logError(error) {
      const currentTime = Date.now();
  
      // Clear old errors if the interval has passed
      if (currentTime - this.lastClearTime > this.clearInterval) {
        this.errors = [];
        this.lastClearTime = currentTime;
      }
  
      // Add new error if we haven't reached the maximum
      if (this.errors.length < this.maxErrors) {
        this.errors.push({
          message: error.message,
          stack: error.stack,
          time: currentTime
        });
        console.error(`Error logged: ${error.message}`);
      } else {
        console.warn("Maximum error limit reached. Error not logged.");
      }
    }
  
    getErrors() {
      return this.errors;
    }
  }
  
  // Usage
  const errorHandler = new ErrorHandler(5, 30000); // Max 5 errors, clear every 30 seconds
  
  // Override the default error handler
  window.onerror = function(message, source, lineno, colno, error) {
    errorHandler.logError(error || new Error(message));
    return true; // Prevents the firing of the default event handler
  };
  
  // Example usage
  function causeError() {
    throw new Error("Test error");
  }
  
  // Test the error handler
  for (let i = 0; i < 10; i++) {
    try {
      causeError();
    } catch (error) {
      errorHandler.logError(error);
    }
  }