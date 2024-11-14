# msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
# pip install awscli  
# $env:PATH = "C:\Program Files\Amazon\AWSCLIV2;" + $env:PATH
aws --version
# aws configure

# msiexec.exe /i https://github.com/aws/aws-sam-cli/releases/download/v1.127.0/AWS_SAM_CLI_64_PY3.msi
# choco install aws-sam-cli   # or from https://github.com/aws/aws-sam-cli/releases
# $env:PATH = "C:\Program Files\Amazon\AWSSAMCLI\bin;" + $env:PATH
sam --version

# $dockerInstallerUrl = "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"
# $installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
# Invoke-WebRequest -Uri $dockerInstallerUrl -OutFile $installerPath
# Start-Process -FilePath $installerPath -ArgumentList "install" -Wait
# Optionally, add Docker to the PATH if required (usually not needed as the installer takes care of this)
# $env:PATH += ";C:\Program Files\Docker\Docker\resources\bin"
docker --version

# Create a secret: https://aws.amazon.com/secrets-manager/ > Secrets > Store a new secret:
#     Secret type = Other type of secret
#     Two Key/value pairs: username = <your username>, password = <your password> (for example: username = mypguser1234, password = mypgpass1234!)
#     Secret name = /sb/rdscredentials
# Replace your Secret ARN instead of 'arn:aws:secretsmanager${AWS::Region}:${AWS::AccountId}:secret:/sb/rdscredentials-T3ztmQ' in template.yaml.


# ./dev-build-deploy.ps1
