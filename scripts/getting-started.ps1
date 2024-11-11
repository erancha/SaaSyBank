# msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
# pip install awscli  
# $env:PATH = "C:\Program Files\Amazon\AWSCLIV2;" + $env:PATH
aws --version
# aws configure

# msiexec.exe /i https://github.com/aws/aws-sam-cli/releases/download/v1.127.0/AWS_SAM_CLI_64_PY3.msi
# choco install aws-sam-cli   # or from https://github.com/aws/aws-sam-cli/releases
# $env:PATH = "C:\Program Files\Amazon\AWSSAMCLI\bin;" + $env:PATH
sam --version


# Create a secret: AWS Secrets Manager > Secrets > Store a new secret:
#     Secret type = Other type of secret
#     Two Key/value pairs: username = <your username>, password = <your password>
#     Secret name = /sb/rdscredentials
# Replace your Secret ARN instead of 'arn:aws:secretsmanager:eu-central-1:575491442067:secret:/sb/rdscredentials-T3ztmQ' in template.yaml.


# ./dev-build-deploy.ps1
