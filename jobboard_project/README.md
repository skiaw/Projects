<a id="readme-top"></a>

  <h3 align="center">README - JobBoard project</h3>
    <br />

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
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

![product-screenshot]

Hello there! This is our first project, we've tried to build a jobboard, if you have any issues or suggestions, please let us by reporting or requesting them!

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

<li><a href="https://tailwindcss.com">Tailwind</a></li>
<li><a href="https://www.mysql.com">Mysql</a></li>
<li><a href="https://fastapi.tiangolo.com">FastAPI</a></li>


<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

This project should work under Unix/Linux systems(Debian, Ubuntu...). If you're under Windows or MacOS, please run WSL for windows or for MacOS users, install a virtual machin if it doesn't work for you.

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.
* install python3
  ```sh
  sudo apt install python3
  ```
* install virtualenv
  ```sh
  sudo apt install virtualenv
  ```
* install mysql & run it. Create a database, then create a user and give him all access & privileges to this database.
  ```sh
  sudo apt install mysql
  ```
  ```sh
  mysql -u root -p
  ```
  ```sh
  CREATE DATABASE database_name;
  ```
  ```sh
  CREATE USER 'user'@'localhost' IDENTIFIED BY 'password';
  GRANT ALL PRIVILEGES ON database_name.* TO 'user'@'localhost';
  FLUSH PRIVILEGES;
  ```
### Installation

1. Clone the repo
   ```sh
   git clone git@github.com:EpitechMscProPromo2028/T-WEB-501-PAR_14.git
   ```
2. Create a virtual environment in the repo
    ```sh
   cd T-WEB-501-PAR_14
    ```
    ```sh
    git checkout main
    ```
    ```sh
   virtualenv name_env
    ```
3. Create a .env file in back/ with your Database name, the user and the password like this :

![env-screenshot]

4. Run the environment and install requirements.txt
   ```sh
   source name_env/bin/activate
   ```
   ```sh
   pip install -r back/requirements.txt
   ```
5. Host our fastAPI
   ```sh
    python3 back/main.py
   ```
6. Host our front 
   ```sh
    python3 http.server 5500
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

Your Jobboard should be working now, you can simulate a jobboard, with differents sections for companies & applicants. A 3rd role, admin has been added to be able to manage it.
You have to be an applicants to be able to apply to job offers.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Walid KORICHE - walid-mustafa.koriche@epitech.eu
Frederic Prassette - frederic.prassette@epitech.eu
Tyliann Cellier-Fuma - Tyliann.cellier-fuma@epitech.eu

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: /contributors.png
[contributors-url]: https://github.com/EpitechMscProPromo2028/T-WEB-501-PAR_14/graphs/contributors
[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=for-the-badge
[license-url]: https://github.com/othneildrew/Best-README-Template/blob/master/LICENSE.txt
[product-screenshot]: readme_public/image.png
[Tailwind.css]:https://www.okoone.com/wp-content/uploads/2024/10/tailwindcss-logo.png
[Tailwind-url]:https://tailwindcss.com
[Fastapi-url]:https://fastapi.tiangolo.com
[Mysql-url]:https://www.mysql.com
[env-screenshot]:readme_public/env_screenshot.png