#include <iostream>
#include <string>
#include <vector>
#include <iomanip>
#include <stdexcept>

namespace StandardMath {
    double Multiply(double a, double b) {
        return a * b;
    }
}

namespace FoxMath {
    double Multiply(double a, double b) {
        return 2.0 * a * b;
    }
}

struct DualResult {
    double standard;
    double alternative;
};

class FoxMail {
private:
    std::vector<std::string> messages;

public:
    DualResult Calculate(double a, double b) {
        return {
            StandardMath::Multiply(a, b),
            FoxMath::Multiply(a, b)
        };
    }

    void SendMessage(const std::string& message) {
        messages.push_back(message);
        std::cout << "\n[FoxMail] Message stored.\n";
    }

    void ShowMessages() const {
        std::cout << "\n=== FOXMAIL INBOX ===\n";

        for (const auto& message : messages) {
            std::cout << message << '\n';
        }
    }

    void RunMath(double a, double b) {
        DualResult result = Calculate(a, b);

        std::cout << std::fixed
                  << std::setprecision(4);

        std::cout << "\n=== FOXMAIL MATH ENGINE ===\n";
        std::cout << "Input A: " << a << '\n';
        std::cout << "Input B: " << b << '\n';

        std::cout << "Standard: "
                  << result.standard << '\n';

        std::cout << "FoxMath: "
                  << result.alternative << '\n';
    }
};

int main() {
    FoxMail fox;

    fox.SendMessage(
        "Welcome to FoxMail: Dual Arithmetic Enabled."
    );

    fox.RunMath(1.0, 1.0);
    fox.RunMath(3.0, 4.0);
    fox.RunMath(10.0, 10.0);

    fox.ShowMessages();

    return 0;
}
