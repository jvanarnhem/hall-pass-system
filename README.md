# Hall Pass Tracking System

A modern, web-based hall pass management system for schools using Google Workspace.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Google%20Apps%20Script-green.svg)
![Frontend](https://img.shields.io/badge/frontend-React-61dafb.svg)

## ✨ Features

- 🎓 **Student Self-Service** - Students check themselves out with just their ID
- 📊 **Real-Time Dashboard** - Track all active passes instantly
- 📈 **Analytics** - Identify patterns and frequent users
- 📧 **Personalized QR Codes** - Email custom room links to teachers
- 📱 **Mobile Friendly** - Works on phones, tablets, and computers
- 🔒 **Secure Authentication** - Google OAuth for staff access
- ☁️ **Zero Infrastructure** - No servers needed, runs on Google Sheets
- ⚡ **Quick Setup** - Deploy in 1-2 hours

## 🎯 Who Is This For?

- **K-12 Schools** using Google Workspace
- **High Schools** and **Middle Schools** tracking student movement
- **School administrators** wanting real-time hall pass data
- **Teachers** who need a simple check-out system

## 🚀 Quick Start

**1. Copy the Google Sheet**
- Create a new Google Sheet and run the setup script

**2. Set Up Backend**
- Follow the [Complete Setup Guide](docs/SETUP.md)
- Takes about 30 minutes

**3. Deploy Frontend**
- Host on Firebase (free) or any static hosting
- Takes about 30 minutes

**4. You're Done!**
- Import your student roster
- Add staff emails
- Start tracking passes

## 📸 Screenshots

### Student Check-Out Interface
*Clean, simple interface for quick check-outs*

![Student Interface](docs/screenshots/student-checkout.png)

### Staff Dashboard - Active Passes
*See who's out of class in real-time*

![Dashboard](docs/screenshots/dashboard-active.png)

### Staff Dashboard - Today's View
*Review all passes from today*

![Today View](docs/screenshots/dashboard-today.png)

### Analytics
*Identify patterns and frequent users*

![Analytics](docs/screenshots/analytics.png)

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Google Apps Script |
| **Database** | Google Sheets |
| **Frontend** | React + Tailwind CSS |
| **Authentication** | Google OAuth 2.0 |
| **Hosting** | Firebase (or any static host) |
| **Icons** | Lucide React |

## 📋 Requirements

- Google Workspace (formerly G Suite) account
- Google Cloud Project (free)
- Node.js 14+ (for frontend development)
- Firebase account (free tier works) or alternative hosting

## 📚 Documentation

- 📖 **[Complete Setup Guide](docs/SETUP.md)** - Step-by-step installation
- 🔐 **[Privacy & FERPA](docs/PRIVACY.md)** - Student data compliance
- ❓ **[FAQ](docs/FAQ.md)** - Common questions
- 🤝 **[Contributing](docs/CONTRIBUTING.md)** - How to contribute

## 🎓 Use Cases

### Scenario 1: Traditional Classroom
- Teacher displays QR code on classroom screen
- Students scan to access their room's check-out page
- Students check themselves out and in
- Teacher monitors dashboard on their computer

### Scenario 2: Dedicated Check-Out Station
- School places a Chromebook near classroom door
- Bookmark loaded to the room's check-out page
- Students use station to check out/in
- No teacher interaction needed

### Scenario 3: Google Classroom Integration
- Teacher posts room link in Google Classroom
- Students click link to check out
- Works from any device (phone, tablet, laptop)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

- 🐛 **Report bugs** - Open an issue
- 💡 **Suggest features** - Start a discussion
- 🔧 **Submit fixes** - Fork, fix, and submit a pull request
- 📖 **Improve docs** - Help make setup easier for others
- ⭐ **Star the repo** - Show your support!

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**What this means for you:**
- ✅ Use it freely in your school (even commercially)
- ✅ Modify it to fit your needs
- ✅ Share it with other schools
- ✅ No warranty - use at your own risk

## 🙏 Acknowledgments

**Created by:** Jeff VanArnhem, Olmsted Falls City Schools

**Built with:**
- [Google Apps Script](https://developers.google.com/apps-script)
- [React](https://react.dev/)
- [Firebase](https://firebase.google.com/)
- [Lucide Icons](https://lucide.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

**Inspired by:** The need for a modern, free alternative to expensive hall pass systems.

## 🔒 Privacy & Security

This system handles student data responsibly:

- ✅ Data stored in your Google Sheets (you control it)
- ✅ Staff authentication via Google OAuth
- ✅ No third-party data sharing
- ✅ FERPA-compliant (when configured properly)
- ⚠️ Users responsible for following district privacy policies

See [PRIVACY.md](docs/PRIVACY.md) for detailed information.

## 💬 Support

- 📫 **Issues:** GitHub Issues (coming soon)
- 💭 **Discussions:** GitHub Discussions (coming soon)
- 📧 **Email:** jvanarnhem@ofcs.net (for serious inquiries)

**No official support is provided**, but the community may help!

## 🗺️ Roadmap

Future features we're considering:

- [ ] Multi-building support
- [ ] Parent notifications via email
- [ ] Integration with popular SIS systems
- [ ] Native mobile app
- [ ] Advanced reporting and exports
- [ ] Teacher approval workflow
- [ ] Time limits and auto-check-in

## ⚖️ Disclaimer

This software is provided "as-is" without warranty of any kind.

**The authors and Olmsted Falls City Schools:**
- Make no guarantees about functionality or reliability
- Are not liable for data loss, system failures, or misuse
- Provide no official support or maintenance
- Are not responsible for FERPA compliance (that's on you!)

**Always:**
- Test thoroughly before production use
- Maintain regular backups
- Follow your district's IT and privacy policies
- Consult with your IT department

---

**Made with ❤️ for educators, by educators**

If this project helps your school, consider giving it a ⭐ star on GitHub!