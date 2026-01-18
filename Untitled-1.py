class ILogger:
    def log(self, message):
        pass

class FileLogger(ILogger):
    def log(self, message):
        print(f"File log: {message}")

class ConsoleLogger(ILogger):
    def log(self, message):
        print(f"Console log: {message}")

class Application:
    def __init__(self, logger: ILogger):
        self.logger = logger
    def run(self):
        self.logger.log("App started")

# Usage
app = Application(ConsoleLogger())
app.run()