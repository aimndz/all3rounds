<a id="readme-top"></a>

<!-- PROJECT LOGO -->

<br />
<div align="center">
  <img src="https://github.com/user-attachments/assets/4d59247d-2f3d-45de-ba04-3c9e4ecafd2c" alt="a3r-logo-full" width="300">
  <h1 align="center">All3Rounds</h3>

  <p align="center">
    The Filipino Battle Rap Archive
    <br />
    <br />
    <a href="https:/all3rounds.vercel.app">View Demo</a>
    &middot;
    <a href="https://github.com/aimndz/all3rounds/issues">Report Bug</a>
    &middot;
    <a href="https://github.com/aimndz/all3rounds/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

<p>
  <img width="1903" height="1077" alt="Screenshot 2026-03-07 232510" src="https://github.com/user-attachments/assets/77a337ef-5852-438b-af54-d1937542c252" />
</p>

All3Rounds is a database and transcript archive focused on Philippine battle rap. It compiles transcripts, battle records, and emcee profiles into a single searchable platform. Users can explore battles, review punchlines, and examine emcee performance data.

Key features:
* **Powerful Search**: Fast full-text search across thousands of battle transcripts.
* **Synced Transcripts**: Read along with battle videos with time-synced lyrics.
* **Emcee Directory**: Detailed statistics and battle history for every league emcee.
* **Transcription Pipeline**: Automated Whisper-based pipeline for processing new battles.

### Supported Leagues
Currently optimized for and featuring data from:
* **[FlipTop Battle League](https://www.youtube.com/fliptopbattles)** - The first and largest professional battle rap conference in the Philippines.

### Built With

* [![Next][Next.js]][Next-url]
* [![React][React.js]][React-url]
* [![Tailwind][Tailwind.com]][Tailwind-url]
* [![Supabase][Supabase.com]][Supabase-url]
* [![Zustand][Zustand.js]][Zustand-url]
* [![TypeScript][TypeScript.org]][TypeScript-url]

<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running follow these simple steps.

### Prerequisites

* Node.js v20+
* pnpm
  ```sh
  npm install -g pnpm
  ```

### Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/aimndz/all3rounds.git
   cd all3rounds
   ```

2. **Install dependencies**
   ```sh
   pnpm install
   ```

3. **Set up Environment Variables**
   Initialize your `.env` file using the template:
   ```sh
   cp .env.example .env
   ```
   _Open the newly created `.env` file and fill it in.

4. **Run the development server**
   ```sh
   pnpm dev

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/aimndz/all3rounds.svg?style=for-the-badge
[contributors-url]: https://github.com/aimndz/all3rounds/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/aimndz/all3rounds.svg?style=for-the-badge
[forks-url]: https://github.com/aimndz/all3rounds/network/members
[stars-shield]: https://img.shields.io/github/stars/aimndz/all3rounds.svg?style=for-the-badge
[stars-url]: https://github.com/aimndz/all3rounds/stargazers
[issues-shield]: https://img.shields.io/github/issues/aimndz/all3rounds.svg?style=for-the-badge
[issues-url]: https://github.com/aimndz/all3rounds/issues
[license-shield]: https://img.shields.io/github/license/aimndz/all3rounds.svg?style=for-the-badge
[license-url]: https://github.com/aimndz/all3rounds/blob/master/LICENSE
[product-screenshot]: public/logo.png
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Tailwind.com]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Supabase.com]: https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.com/
[Zustand.js]: https://img.shields.io/badge/Zustand-444444?style=for-the-badge&logo=react&logoColor=white
[Zustand-url]: https://github.com/pmndrs/zustand
[TypeScript.org]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
