   # msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
   # pip install awscli  
   # $env:PATH = "C:\Program Files\Amazon\AWSCLIV2;" + $env:PATH
   aws --version
   # aws configure

   # msiexec.exe /i https://github.com/aws/aws-sam-cli/releases/download/v1.127.0/AWS_SAM_CLI_64_PY3.msi
   # choco install aws-sam-cli   # or from https://github.com/aws/aws-sam-cli/releases
   # $env:PATH = "C:\Program Files\Amazon\AWSSAMCLI\bin;" + $env:PATH
   sam --version

   # .\dev-build-deploy-delete.ps1

   ./npm-start.ps1