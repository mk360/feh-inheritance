package array

func FilterOut(arr []string, el string) []string {
	var copy []string = []string{}
	for _, element := range arr {
		if element != el {
			copy = append(copy, element)
		}
	}

	return copy
}

func Includes[T comparable](arr []T, el T) bool {
	for _, element := range arr {
		if element == el {
			return true
		}
	}

	return false
}

func Equals[T comparable](array1 []T, array2 []T) bool {
	if len(array1) != len(array2) {
		return false
	}
	for i, el := range array1 {
		if array2[i] != el {
			return false
		}
	}

	return true
}
