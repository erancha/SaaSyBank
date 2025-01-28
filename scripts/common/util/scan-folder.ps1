param (
    [string]$FolderPath,
    [string]$OutputFile = "output.txt"
)

function Write-Content {
    param (
        [string]$Path,
        [string]$Content,
        [string]$SeparatorChar
    )
    # Construct the output string
    if ($SeparatorChar) {
        $separatorLine = "`n" + $SeparatorChar * 40 + "`n"
    } else {
        $separatorLine = '';
    }
    $formattedOutput = "$separatorLine${Path}:$separatorLine$Content"
    Add-Content -Path $OutputFile -Value $formattedOutput
}

# Clear the output file if it already exists
if (Test-Path $OutputFile) {
    Remove-Item $OutputFile
}

# Function to get the last two parent folders
function Get-LastTwoParentFolders {
    param (
        [string]$Path
    )
    $parentPath = Split-Path $Path -Parent
    $parentFolders = Split-Path $parentPath -Leaf
    $grandParentPath = Split-Path $parentPath -Parent
    $grandParentFolders = Split-Path $grandParentPath -Leaf

    return "$grandParentFolders\$parentFolders"
}

# Function to display the folder hierarchy
function Display-FolderHierarchy {
    param (
        [string]$Path,
        [int]$Depth = 1
    )

    $indentation = ' ' * ($Depth * 3)  # 3 spaces per depth level
    $items = Get-ChildItem -Path $Path -Force

    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            # Exclude specified folders
            if ($item.Name -notin @('node_modules', '.git')) {  
                Write-Content -Path "$indentation$item" -Content ''
                # Recursively display contents of the subfolder
                Display-FolderHierarchy -Path $item.FullName -Depth ($Depth + 1)
            }
        } else {
            # Process only specified file types
            if ($item.Extension -in @('.js', '.jsx', '.ts', '.tsx', '.json') -and $item.Name -ne 'package-lock.json') {
                Write-Content -Path "$indentation$item" -Content ''
            }
        }
    }
}

# Start by writing the header for the hierarchy
Add-Content -Path $OutputFile -Value "Folder Hierarchy for ${FolderPath}:`n"

# Display the folder hierarchy and write it to the output file
Display-FolderHierarchy -Path $FolderPath

# Recursively scan the folder (Depth-first)
function Scan-Folder {
    param (
        [string]$CurrentFolder
    )

    # Retrieve files and folders
    $items = Get-ChildItem -Path $CurrentFolder -Force

    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            # Exclude specified folders
            if ($item.Name -notin @('node_modules', '.git')) {  
                # If it's a folder, write its path and call Scan-Folder recursively
                $subfolderName = Join-Path -Path (Get-LastTwoParentFolders -Path $item.FullName) -ChildPath ($item.FullName -replace [regex]::Escape($FolderPath), '')
                Write-Content -Path $subfolderName -Content '' -SeparatorChar '='
                Scan-Folder -CurrentFolder $item.FullName
            }
        } else {
            # If it's a file, read its content and write to output only if it's a specified type
            if ($item.Extension -in @('.js', '.jsx', '.ts', '.tsx', '.json') -and $item.Name -ne 'package-lock.json') {
                $fileName = "<folder>" + $item.FullName -replace [regex]::Escape($CurrentFolder), ''
                $fileContent = Get-Content -Path $item.FullName -ErrorAction SilentlyContinue -Raw
                Write-Content -Path $fileName -Content $fileContent -SeparatorChar '-'
            }
        }
    }
}

# Start scanning from the specified folder
Scan-Folder -CurrentFolder $FolderPath
